import { FastifyPluginAsync } from 'fastify';
import { settingsStore, HouseholdSettings } from '../storage/settingsStore.js';

export interface SettingsRouteOptions {
  store?: typeof settingsStore;
}

export const settingsRoutes: FastifyPluginAsync<SettingsRouteOptions> = async (fastify, options) => {
  const store = options.store || settingsStore;

  // GET /api/settings - retrieve household-wide custom groups, names, and hidden entities
  fastify.get('/api/settings', async (_request, reply) => {
    try {
      const settings = await store.getSettings();
      return reply.code(200).send({
        success: true,
        settings,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve household settings',
      });
    }
  });

  // POST /api/settings - save or update household settings
  fastify.post('/api/settings', async (request, reply) => {
    try {
      const body = request.body as Partial<HouseholdSettings>;
      if (!body || typeof body !== 'object') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid payload: settings object required',
        });
      }

      const updated = await store.saveSettings(body);
      return reply.code(200).send({
        success: true,
        settings: updated,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: 'Failed to save household settings',
      });
    }
  });
};
