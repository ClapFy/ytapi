import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config';

const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Origin',
  'X-Requested-With',
  'x-api-key',
  'x-admin-password',
] as const;

function corsOriginOption(): boolean | ((origin: string | undefined, callback: (err: Error | null, allow: boolean | string) => void) => void) {
  const raw = config.corsOrigins;
  if (!raw || raw === '*') {
    return true;
  }
  const allowed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) {
    return true;
  }
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowed.includes(origin) ? origin : false);
  };
}
import { bootstrapYtdlpCookies } from './services/ytdlp-cookies-bootstrap';
import { storage } from './services/storage';
import { downloadRoutes } from './routes/download';
import { keysRoutes } from './routes/keys';
import { statsRoutes } from './routes/stats';
import { wsRoutes } from './routes/ws';

async function start() {
  // Initialize storage
  await storage.init();
  await bootstrapYtdlpCookies();

  const fastify = Fastify({
    logger: true,
    trustProxy: true,
  });

  await fastify.register(cors, {
    origin: corsOriginOption(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86_400,
  });

  await fastify.register(websocket);

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // API routes
  await fastify.register(downloadRoutes, { prefix: '/api/download' });
  await fastify.register(keysRoutes, { prefix: '/api/keys' });
  await fastify.register(statsRoutes, { prefix: '/api/stats' });
  await fastify.register(wsRoutes, { prefix: '/ws' });

  // Serve static dashboard files (Next export: index.html, dashboard.html, docs.html)
  const dashboardPath = path.join(__dirname, '../../dashboard/dist');

  await fastify.register(fastifyStatic, {
    root: dashboardPath,
    prefix: '/',
  });

  fastify.get('/', async (_request, reply) => {
    return reply.sendFile('index.html', dashboardPath);
  });

  const servePage =
    (file: string) =>
    async (_request: FastifyRequest, reply: FastifyReply) =>
      reply.sendFile(file, dashboardPath);

  fastify.get('/dashboard', servePage('dashboard.html'));
  fastify.get('/dashboard/', servePage('dashboard.html'));
  fastify.get('/docs', servePage('docs.html'));
  fastify.get('/docs/', servePage('docs.html'));

  // Unknown non-API paths: map to the right exported HTML shell
  fastify.setNotFoundHandler(async (request, reply) => {
    const pathname = request.url.split('?')[0] || '/';
    if (pathname.startsWith('/api/') || pathname.startsWith('/ws/') || pathname === '/health') {
      return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    }
    if (pathname.startsWith('/dashboard')) {
      return reply.sendFile('dashboard.html', dashboardPath);
    }
    if (pathname.startsWith('/docs')) {
      return reply.sendFile('docs.html', dashboardPath);
    }
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
