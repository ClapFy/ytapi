import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { storage } from '../services/storage';
import { validateAdminPassword } from '../services/auth';
import type { ApiKey } from '../types';

interface CreateKeyBody {
  name: string;
}

interface DeleteKeyParams {
  id: string;
}

// Generate a secure API key
function generateApiKey(): string {
  return 'yt_' + crypto.randomBytes(32).toString('hex');
}

export async function keysRoutes(fastify: FastifyInstance) {
  // GET /api/keys - List all keys (admin only)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const password = request.headers['x-admin-password'] as string;
    
    if (!validateAdminPassword(password)) {
      return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    const keys = await storage.getAllKeys();
    return {
      keys: keys.map(k => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        totalRequests: k.totalRequests,
        // Show first 8 and last 4 characters of the key
        key: `${k.key.slice(0, 12)}...${k.key.slice(-4)}`,
      })),
    };
  });

  // POST /api/keys - Create a new key (admin only)
  fastify.post('/', async (request: FastifyRequest<{ Body: CreateKeyBody }>, reply: FastifyReply) => {
    const password = request.headers['x-admin-password'] as string;
    
    if (!validateAdminPassword(password)) {
      return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    const { name } = request.body;

    if (!name || name.trim().length === 0) {
      return reply.status(400).send({ error: 'Name is required', code: 'MISSING_NAME' });
    }

    const fullKey = generateApiKey();
    const key: ApiKey = {
      id: uuidv4(),
      key: fullKey,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      totalRequests: 0,
    };

    await storage.createKey(key);

    return {
      success: true,
      key: {
        id: key.id,
        name: key.name,
        createdAt: key.createdAt,
        key: `${key.key.slice(0, 12)}...${key.key.slice(-4)}`,
      },
      fullKey, // Only shown once on creation
    };
  });

  // DELETE /api/keys/:id - Delete a key (admin only)
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: DeleteKeyParams }>, reply: FastifyReply) => {
    const password = request.headers['x-admin-password'] as string;
    
    if (!validateAdminPassword(password)) {
      return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    const { id } = request.params;
    const deleted = await storage.deleteKey(id);

    if (!deleted) {
      return reply.status(404).send({ error: 'Key not found', code: 'NOT_FOUND' });
    }

    return { success: true, message: 'Key deleted' };
  });

  // GET /api/keys/stats - Get stats (admin only)
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const password = request.headers['x-admin-password'] as string;
    
    if (!validateAdminPassword(password)) {
      return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    const stats = await storage.getStats();
    const recentRequests = await storage.getRecentRequests(10);

    return {
      ...stats,
      recentRequests,
    };
  });
}
