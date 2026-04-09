import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { validateApiKey } from '../services/auth';
import { storage } from '../services/storage';
import { downloadVideo, createYtdlpStream, getVideoInfo } from '../services/ytdlp';
import { sendWebhook } from '../services/webhook';
import type { DownloadRequest } from '../types';

interface DownloadBody {
  url: string;
  webhook_url?: string;
  webhook_secret?: string;
}

interface DownloadParams {
  id: string;
}

// Active downloads map for progress tracking
const activeDownloads = new Map<string, { 
  process: ReturnType<typeof createYtdlpStream>; 
  cancel: () => void;
  error?: string;
}>();

export async function downloadRoutes(fastify: FastifyInstance) {
  // POST /api/download - Start a new download
  fastify.post('/', async (request: FastifyRequest<{ Body: DownloadBody }>, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return reply.status(401).send({ error: 'API key required', code: 'MISSING_API_KEY' });
    }

    const { valid, keyId } = await validateApiKey(apiKey);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid API key', code: 'INVALID_API_KEY' });
    }

    const { url, webhook_url, webhook_secret } = request.body;

    if (!url) {
      return reply.status(400).send({ error: 'URL is required', code: 'MISSING_URL' });
    }

    // Validate URL format (basic check)
    try {
      new URL(url);
    } catch {
      return reply.status(400).send({ error: 'Invalid URL', code: 'INVALID_URL' });
    }

    const downloadId = uuidv4();
    const downloadRequest: DownloadRequest = {
      id: downloadId,
      url,
      apiKeyId: keyId!,
      status: 'pending',
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

    // Send started webhook
    if (webhook_url) {
      await sendWebhook(webhook_url, 'download.started', downloadRequest, webhook_secret);
    }

    // Start the download process
    downloadRequest.status = 'downloading';
    await storage.updateRequest({ id: downloadId, status: 'downloading' });

    return {
      success: true,
      downloadId,
      status: 'downloading',
      message: 'Download started',
    };
  });

  // GET /api/download/:id/status - Get download status
  fastify.get('/:id/status', async (request: FastifyRequest<{ Params: DownloadParams }>, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return reply.status(401).send({ error: 'API key required', code: 'MISSING_API_KEY' });
    }

    const { valid } = await validateApiKey(apiKey);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid API key', code: 'INVALID_API_KEY' });
    }

    const { id } = request.params;
    const download = await storage.getRequestById(id);

    if (!download) {
      return reply.status(404).send({ error: 'Download not found', code: 'NOT_FOUND' });
    }

    return {
      downloadId: download.id,
      status: download.status,
      progress: download.progress,
      speed: download.speed,
      eta: download.eta,
      filename: download.filename,
      title: download.title,
      error: download.error,
      createdAt: download.createdAt,
      completedAt: download.completedAt,
    };
  });

  // POST /api/download/direct - Direct download without tracking (simpler)
  fastify.post('/direct', async (request: FastifyRequest<{ Body: DownloadBody }>, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return reply.status(401).send({ error: 'API key required', code: 'MISSING_API_KEY' });
    }

    const { valid, keyId } = await validateApiKey(apiKey);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid API key', code: 'INVALID_API_KEY' });
    }

    const { url, webhook_url, webhook_secret } = request.body;

    if (!url) {
      return reply.status(400).send({ error: 'URL is required', code: 'MISSING_URL' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return reply.status(400).send({ error: 'Invalid URL', code: 'INVALID_URL' });
    }

    // Get video info for filename
    const videoInfo = await getVideoInfo(url);
    if (!videoInfo) {
      return reply.status(400).send({ 
        error: 'Could not fetch video info. The URL may be invalid or the video is unavailable.', 
        code: 'VIDEO_NOT_FOUND' 
      });
    }
    
    const filename = videoInfo.title ? `${videoInfo.title}.mp4` : 'video.mp4';

    // Create a download record
    const downloadId = uuidv4();
    const downloadRequest: DownloadRequest = {
      id: downloadId,
      url,
      apiKeyId: keyId!,
      status: 'downloading',
      progress: 0,
      title: videoInfo.title,
      createdAt: new Date().toISOString(),
      webhookUrl: webhook_url,
      webhookSecret: webhook_secret,
    };

    await storage.addRequest(downloadRequest);

    // Send webhook if configured
    if (webhook_url) {
      await sendWebhook(webhook_url, 'download.started', downloadRequest, webhook_secret);
    }

    // Set headers
    reply.header('Content-Type', 'video/mp4');
    reply.header('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9\-_\. ]/g, '_')}"`);
    reply.header('Transfer-Encoding', 'chunked');

    // Track any error during download
    let downloadError: string | undefined;

    // Stream the video
    const stream = createYtdlpStream(url);
    
    stream.stderr.on('data', (data: Buffer) => {
      const line = data.toString();
      
      // Capture error messages from yt-dlp
      if (line.toLowerCase().includes('error') || 
          line.toLowerCase().includes('failed') || 
          line.toLowerCase().includes('unable') ||
          line.toLowerCase().includes('not available')) {
        downloadError = line.trim();
      }
      
      // Parse progress
      const progressMatch = line.match(/(\d+\.?\d*)%/);
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        storage.updateRequest({ id: downloadId, progress });
      }
    });

    // Handle errors
    stream.on('error', async (error: Error) => {
      const errorMessage = downloadError || error.message || 'Download stream error';
      console.error('Stream error:', errorMessage);
      
      await storage.updateRequest({ 
        id: downloadId, 
        status: 'failed', 
        error: errorMessage,
        completedAt: new Date().toISOString(),
      });
      
      if (webhook_url) {
        await sendWebhook(webhook_url, 'download.failed', {
          ...downloadRequest,
          status: 'failed',
          error: errorMessage,
        }, webhook_secret);
      }
      
      // If headers already sent, we can't send error response
      if (!reply.sent) {
        reply.status(500).send({ 
          error: errorMessage, 
          code: 'DOWNLOAD_FAILED',
          downloadId
        });
      }
    });

    stream.on('close', async (code: number) => {
      const success = code === 0 && !downloadError;
      const status = success ? 'completed' : 'failed';
      const finalError = success ? undefined : (downloadError || `Download failed with exit code ${code}`);

      await storage.updateRequest({ 
        id: downloadId, 
        status,
        progress: success ? 100 : downloadRequest.progress,
        error: finalError,
        completedAt: new Date().toISOString(),
      });
      
      if (webhook_url) {
        await sendWebhook(webhook_url, `download.${status}` as any, {
          ...downloadRequest,
          status,
          progress: success ? 100 : downloadRequest.progress,
          error: finalError,
        }, webhook_secret);
      }
    });

    return reply.send(stream.stdout);
  });
}
