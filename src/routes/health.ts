import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/healthz', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/readyz', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });
};
