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

  // POST /api/auth/login - verify profile PIN
  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const { userId, pin } = request.body as { userId?: string; pin?: string };
      if (!userId) {
        return reply.code(400).send({ success: false, error: 'User ID is required' });
      }

      const settings = await store.getSettings();
      const user = settings.users.find((u) => u.id === userId);
      if (!user) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      // If user has a PIN, verify it
      if (user.pin && user.pin.trim() !== '') {
        if (!pin || pin.trim() !== user.pin.trim()) {
          return reply.code(401).send({ success: false, error: 'Incorrect PIN' });
        }
      }

      return reply.code(200).send({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          allowedGroupIds: user.allowedGroupIds,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ success: false, error: 'Login authentication failed' });
    }
  });

  // GET /api/users - list public user profiles (PINs excluded for security)
  fastify.get('/api/users', async (_request, reply) => {
    try {
      const settings = await store.getSettings();
      const safeUsers = settings.users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        hasPin: Boolean(u.pin && u.pin.trim() !== ''),
        allowedGroupIds: u.allowedGroupIds,
      }));
      return reply.code(200).send({
        success: true,
        users: safeUsers,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ success: false, error: 'Failed to retrieve users' });
    }
  });
};
