import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import path from 'path';
import { config } from './config';
import { storage } from './services/storage';
import { downloadRoutes } from './routes/download';
import { keysRoutes } from './routes/keys';
import { statsRoutes } from './routes/stats';
import { wsRoutes } from './routes/ws';

async function start() {
  // Initialize storage
  await storage.init();

  const fastify = Fastify({
    logger: true,
    trustProxy: true,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(websocket);

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // API routes
  await fastify.register(downloadRoutes, { prefix: '/api/download' });
  await fastify.register(keysRoutes, { prefix: '/api/keys' });
  await fastify.register(statsRoutes, { prefix: '/api/stats' });
  await fastify.register(wsRoutes, { prefix: '/ws' });

  // Serve static dashboard files
  const dashboardPath = path.join(__dirname, '../../dashboard/dist');
  
  // Serve static files
  fastify.register(require('@fastify/static'), {
    root: dashboardPath,
    prefix: '/',
  });

  // Serve index.html for root and dashboard paths
  fastify.get('/', async (request, reply) => {
    return reply.sendFile('index.html', dashboardPath);
  });

  fastify.get('/dashboard', async (request, reply) => {
    return reply.sendFile('index.html', dashboardPath);
  });

  fastify.get('/docs', async (request, reply) => {
    return reply.sendFile('index.html', dashboardPath);
  });

  // Handle client-side routing - serve index.html for all unknown routes
  fastify.setNotFoundHandler(async (request, reply) => {
    // If it's an API route, return 404
    if (request.url.startsWith('/api/') || request.url.startsWith('/ws/') || request.url === '/health') {
      return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    }
    // Otherwise serve the dashboard
    return reply.sendFile('index.html', dashboardPath);
  });

  // Start server
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📊 Dashboard: http://localhost:${config.port}`);
    console.log(`📖 API Docs: http://localhost:${config.port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
