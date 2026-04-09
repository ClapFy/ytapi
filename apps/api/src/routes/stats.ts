import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { storage } from '../services/storage';
import { validateAdminPassword } from '../services/auth';

export async function statsRoutes(fastify: FastifyInstance) {
  // GET /api/stats - Get system stats (admin only)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
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
