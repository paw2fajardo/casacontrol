import type { FastifyPluginAsync } from 'fastify';
import { GoogleClient } from '../integrations/google/client.js';
import type { UnifiedScheduleResult } from '../integrations/google/types.js';
import { config } from '../config/index.js';

export interface ScheduleRouteOptions {
  googleClient?: {
    getUnifiedSchedule: (timeMin?: string, timeMax?: string) => Promise<UnifiedScheduleResult>;
  };
}

export const scheduleRoutes: FastifyPluginAsync<ScheduleRouteOptions> = async (
  fastify,
  options
) => {
  const client =
    options?.googleClient ||
    new GoogleClient({
      clientId: (config.GOOGLE_CLIENT_ID as string) || process.env.GOOGLE_CLIENT_ID,
      clientSecret: (config.GOOGLE_CLIENT_SECRET as string) || process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: (config.GOOGLE_REFRESH_TOKEN as string) || process.env.GOOGLE_REFRESH_TOKEN,
    });

  fastify.get('/api/schedule', async (request, reply) => {
    try {
      const query = request.query as { timeMin?: string; timeMax?: string } | undefined;
      const result = await client.getUnifiedSchedule(query?.timeMin, query?.timeMax);
      return reply.code(result.success ? 200 : 502).send(result);
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        items: [],
        count: 0,
        error: err?.message || 'Internal server error while fetching schedule',
      });
    }
  });
};
