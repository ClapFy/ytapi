import type { FastifyInstance } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { storage } from '../services/storage';
import { validateApiKey } from '../services/auth';
import { getVideoInfo, createYtdlpStream } from '../services/ytdlp';
import { sendWebhook } from '../services/webhook';

interface WebSocketQuery {
  apiKey?: string;
}

// Store active WebSocket connections
const activeConnections = new Map<string, SocketStream>();

export async function wsRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for live download progress
  fastify.get('/download/:id', { websocket: true }, async (connection: SocketStream, req: FastifyRequest) => {
    const { id: downloadId } = req.params as { id: string };
    const { apiKey } = req.query as WebSocketQuery;

    if (!apiKey) {
      connection.socket.send(JSON.stringify({ error: 'API key required', code: 'MISSING_API_KEY' }));
      connection.socket.close();
      return;
    }

    const { valid } = await validateApiKey(apiKey);
    if (!valid) {
      connection.socket.send(JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }));
      connection.socket.close();
      return;
    }

    const download = await storage.getRequestById(downloadId);
    if (!download) {
      connection.socket.send(JSON.stringify({ error: 'Download not found', code: 'NOT_FOUND' }));
      connection.socket.close();
      return;
    }

    // Store connection
    activeConnections.set(downloadId, connection);

    // Send initial state
    connection.socket.send(JSON.stringify({
      type: 'status',
      downloadId,
      data: {
        status: download.status,
        progress: download.progress,
        speed: download.speed,
        eta: download.eta,
        filename: download.filename,
        title: download.title,
      },
    }));

    // If download is still active, we could stream progress here
    // For now, we'll just keep the connection open for status updates

    connection.socket.on('close', () => {
      activeConnections.delete(downloadId);
    });

    connection.socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.action === 'cancel') {
          // Cancel the download if active
          connection.socket.send(JSON.stringify({
            type: 'cancelled',
            downloadId,
          }));
          connection.socket.close();
        }
      } catch (error) {
        // Invalid message
      }
    });
  });

  // WebSocket endpoint for starting a new download with live progress
  fastify.get('/start', { websocket: true }, async (connection: SocketStream, req: FastifyRequest) => {
    const { apiKey, url, webhook_url, webhook_secret } = req.query as {
      apiKey?: string;
      url?: string;
      webhook_url?: string;
      webhook_secret?: string;
    };

    if (!apiKey) {
      connection.socket.send(JSON.stringify({ error: 'API key required', code: 'MISSING_API_KEY' }));
      connection.socket.close();
      return;
    }

    const { valid, keyId } = await validateApiKey(apiKey);
    if (!valid) {
      connection.socket.send(JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }));
      connection.socket.close();
      return;
    }

    if (!url) {
      connection.socket.send(JSON.stringify({ error: 'URL is required', code: 'MISSING_URL' }));
      connection.socket.close();
      return;
    }

    try {
      new URL(url);
    } catch {
      connection.socket.send(JSON.stringify({ error: 'Invalid URL', code: 'INVALID_URL' }));
      connection.socket.close();
      return;
    }

    // Import here to avoid circular dependency
    const { v4: uuidv4 } = await import('uuid');
    const downloadId = uuidv4();

    // Create request
    const downloadRequest = {
      id: downloadId,
      url,
      apiKeyId: keyId!,
      status: 'downloading' as const,
      progress: 0,
      createdAt: new Date().toISOString(),
      webhookUrl: webhook_url,
      webhookSecret: webhook_secret,
    };

    await storage.addRequest(downloadRequest);

    // Get video info
    const videoInfo = await getVideoInfo(url);
    if (videoInfo) {
      downloadRequest.title = videoInfo.title;
      await storage.updateRequest({ id: downloadId, title: videoInfo.title });
    }

    // Send started event
    connection.socket.send(JSON.stringify({
      type: 'started',
      downloadId,
      data: {
        url,
        title: videoInfo?.title,
        status: 'downloading',
      },
    }));

    // Send webhook
    if (webhook_url) {
      await sendWebhook(webhook_url, 'download.started', downloadRequest, webhook_secret);
    }

    // Start download with progress tracking
    const { process: stream } = createYtdlpStream(url);
    let filename = '';

    stream.stderr.on('data', (data: Buffer) => {
      const line = data.toString();
      
      // Parse progress
      const progressMatch = line.match(/(\d+\.?\d*)%\|([^|]*)\|([^|]*)\|?(.*)/);
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        const speed = progressMatch[2]?.trim() || undefined;
        const eta = progressMatch[3]?.trim() || undefined;
        if (progressMatch[4]) {
          filename = progressMatch[4].trim();
        }

        // Update storage
        storage.updateRequest({ id: downloadId, progress, speed, eta, filename });

        // Send to WebSocket
        if (connection.socket.readyState === 1) { // OPEN
          connection.socket.send(JSON.stringify({
            type: 'progress',
            downloadId,
            data: {
              progress,
              speed,
              eta,
              filename,
              status: 'downloading',
            },
          }));
        }

        // Send webhook progress (throttled - every 10%)
        if (webhook_url && Math.floor(progress) % 10 === 0) {
          sendWebhook(webhook_url, 'download.progress', {
            ...downloadRequest,
            progress,
            speed,
            eta,
            filename,
          }, webhook_secret);
        }
      }
    });

    stream.on('error', async (error: Error) => {
      await storage.updateRequest({ 
        id: downloadId, 
        status: 'failed', 
        error: error.message,
        completedAt: new Date().toISOString(),
      });

      if (connection.socket.readyState === 1) {
        connection.socket.send(JSON.stringify({
          type: 'error',
          downloadId,
          data: {
            error: error.message,
            status: 'failed',
          },
        }));
      }

      if (webhook_url) {
        await sendWebhook(webhook_url, 'download.failed', {
          ...downloadRequest,
          status: 'failed',
          error: error.message,
        }, webhook_secret);
      }
    });

    stream.on('close', async (code: number) => {
      const success = code === 0;
      const status = success ? 'completed' : 'failed';

      await storage.updateRequest({ 
        id: downloadId, 
        status,
        progress: success ? 100 : downloadRequest.progress,
        completedAt: new Date().toISOString(),
      });

      if (connection.socket.readyState === 1) {
        connection.socket.send(JSON.stringify({
          type: success ? 'completed' : 'failed',
          downloadId,
          data: {
            status,
            progress: success ? 100 : downloadRequest.progress,
            filename,
          },
        }));
        connection.socket.close();
      }

      if (webhook_url) {
        await sendWebhook(webhook_url, `download.${status}` as any, {
          ...downloadRequest,
          status,
          progress: success ? 100 : downloadRequest.progress,
          filename,
        }, webhook_secret);
      }
    });

    // Stream the actual data to the client
    stream.stdout.on('data', (chunk: Buffer) => {
      if (connection.socket.readyState === 1) {
        // Send binary data as base64 in a message
        connection.socket.send(JSON.stringify({
          type: 'data',
          downloadId,
          data: chunk.toString('base64'),
        }));
      }
    });

    connection.socket.on('close', () => {
      // Cancel the download if connection closes
      stream.kill('SIGTERM');
    });
  });
}

// Helper to send updates to all connected clients for a download
export function broadcastProgress(downloadId: string, data: any) {
  const connection = activeConnections.get(downloadId);
  if (connection && connection.socket.readyState === 1) {
    connection.socket.send(JSON.stringify({
      type: 'progress',
      downloadId,
      data,
    }));
  }
}
