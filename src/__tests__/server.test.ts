import { describe, it, expect, vi } from 'vitest';
import { buildServer } from '../server.js';
import { loadConfig, maskSecrets } from '../config/index.js';

describe('Configuration & Secrets Loader', () => {
  it('loads default values when env vars are missing', () => {
    const conf = loadConfig({});
    expect(conf.PORT).toBe(3000);
    expect(conf.HOST).toBe('0.0.0.0');
    expect(conf.NODE_ENV).toBe('development');
    expect(conf.CARTSYNC_BASE_URL).toBe('http://cartsync:3001');
    expect(conf.CARTSYNC_AUTH_TOKEN).toBeUndefined();
  });

  it('loads provided env vars correctly', () => {
    const conf = loadConfig({
      PORT: '8080',
      HOST: '127.0.0.1',
      CARTSYNC_BASE_URL: 'http://localhost:9090',
      CARTSYNC_AUTH_TOKEN: 'secret-token-123',
    });
    expect(conf.PORT).toBe(8080);
    expect(conf.HOST).toBe('127.0.0.1');
    expect(conf.CARTSYNC_BASE_URL).toBe('http://localhost:9090');
    expect(conf.CARTSYNC_AUTH_TOKEN).toBe('secret-token-123');
  });

  it('masks secret fields properly', () => {
    const raw = {
      PORT: 3000,
      CARTSYNC_AUTH_TOKEN: 'my-super-secret-token',
      HOMEASSISTANT_AUTH_TOKEN: 'ha-token-xyz',
      API_KEY: 'key-123',
      USER_PASSWORD: 'pass',
      CARTSYNC_BASE_URL: 'http://cartsync:3001',
    };
    const masked = maskSecrets(raw);
    expect(masked.PORT).toBe(3000);
    expect(masked.CARTSYNC_BASE_URL).toBe('http://cartsync:3001');
    expect(masked.CARTSYNC_AUTH_TOKEN).toBe('***');
    expect(masked.HOMEASSISTANT_AUTH_TOKEN).toBe('***');
    expect(masked.API_KEY).toBe('***');
    expect(masked.USER_PASSWORD).toBe('***');
  });
});

describe('Fastify Server Scaffold & Routes', () => {
  it('GET /healthz returns status ok and ISO timestamp', async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    await server.close();
  });

  it('GET /readyz returns status ok and ISO timestamp', async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: 'GET',
      url: '/readyz',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    await server.close();
  });

  it('GET /api/groceries returns items from CartSync adapter when successful', async () => {
    const mockClient = {
      getActiveItems: vi.fn().mockResolvedValue({
        success: true,
        items: [
          { id: 1, name: 'Milk', quantity: 2, unit: 'gal', completed: false },
          { id: 2, name: 'Eggs', quantity: 12, completed: false },
        ],
        count: 2,
      }),
    };

    const server = await buildServer({ cartSyncClient: mockClient });
    const response = await server.inject({
      method: 'GET',
      url: '/api/groceries',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].name).toBe('Milk');
    expect(mockClient.getActiveItems).toHaveBeenCalledTimes(1);
    await server.close();
  });

  it('GET /api/groceries returns error envelope and 502 status when CartSync adapter fails', async () => {
    const mockClient = {
      getActiveItems: vi.fn().mockResolvedValue({
        success: false,
        items: [],
        count: 0,
        error: 'Network timeout',
      }),
    };

    const server = await buildServer({ cartSyncClient: mockClient });
    const response = await server.inject({
      method: 'GET',
      url: '/api/groceries',
    });

    expect(response.statusCode).toBe(502);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.items).toEqual([]);
    expect(body.count).toBe(0);
    expect(body.error).toBe('Network timeout');
    await server.close();
  });

  it('GET /api/groceries handles unexpected exceptions gracefully with 500', async () => {
    const mockClient = {
      getActiveItems: vi.fn().mockRejectedValue(new Error('Fatal client crash')),
    };

    const server = await buildServer({ cartSyncClient: mockClient });
    const response = await server.inject({
      method: 'GET',
      url: '/api/groceries',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.items).toEqual([]);
    expect(body.count).toBe(0);
    expect(body.error).toBe('Fatal client crash');
    await server.close();
  });

  it('GET /api/homeassistant/entities returns entity states from HA adapter', async () => {
    const mockHaClient = {
      getStates: vi.fn().mockResolvedValue({
        success: true,
        entities: [
          { entity_id: 'light.living_room', state: 'on', attributes: {} },
          { entity_id: 'lock.front_door', state: 'locked', attributes: {} },
        ],
        count: 2,
      }),
      callService: vi.fn(),
    };

    const server = await buildServer({ haClient: mockHaClient });
    const response = await server.inject({
      method: 'GET',
      url: '/api/homeassistant/entities',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
    expect(body.entities).toHaveLength(2);
    expect(mockHaClient.getStates).toHaveBeenCalledTimes(1);
    await server.close();
  });

  it('POST /api/homeassistant/action blocks high-impact entity without confirmation', async () => {
    const mockHaClient = {
      getStates: vi.fn().mockResolvedValue({
        success: true,
        entities: [{ entity_id: 'lock.front_door', state: 'locked', attributes: {} }],
        count: 1,
      }),
      callService: vi.fn(),
    };

    const server = await buildServer({ haClient: mockHaClient });
    const response = await server.inject({
      method: 'POST',
      url: '/api/homeassistant/action',
      payload: {
        entity_id: 'lock.front_door',
        domain: 'lock',
        service: 'unlock',
        confirmed: false,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.requiresConfirmation).toBe(true);
    expect(mockHaClient.callService).not.toHaveBeenCalled();
    await server.close();
  });

  it('POST /api/homeassistant/action succeeds for high-impact entity with confirmed: true', async () => {
    const mockHaClient = {
      getStates: vi.fn().mockResolvedValue({
        success: true,
        entities: [{ entity_id: 'lock.front_door', state: 'locked', attributes: {} }],
        count: 1,
      }),
      callService: vi.fn().mockResolvedValue({
        success: true,
        result: [{ entity_id: 'lock.front_door', state: 'unlocked' }],
      }),
    };

    const server = await buildServer({ haClient: mockHaClient });
    const response = await server.inject({
      method: 'POST',
      url: '/api/homeassistant/action',
      payload: {
        entity_id: 'lock.front_door',
        domain: 'lock',
        service: 'unlock',
        confirmed: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(mockHaClient.callService).toHaveBeenCalledWith('lock', 'unlock', {
      entity_id: 'lock.front_door',
    });
    await server.close();
  });

  it('GET and POST /api/settings manages household configuration persistence', async () => {
    const server = await buildServer();
    
    // GET initial settings
    const getRes = await server.inject({
      method: 'GET',
      url: '/api/settings',
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.success).toBe(true);
    expect(Array.isArray(getBody.settings.deviceGroups)).toBe(true);

    // POST updated custom names and groups
    const postRes = await server.inject({
      method: 'POST',
      url: '/api/settings',
      payload: {
        customNames: { 'switch.kitchen': 'Pantry Light' },
        deviceGroups: [
          { id: 'kitchen_zone', name: 'Kitchen', entityIds: ['switch.kitchen'] },
        ],
      },
    });
    expect(postRes.statusCode).toBe(200);
    const postBody = JSON.parse(postRes.body);
    expect(postBody.success).toBe(true);
    expect(postBody.settings.customNames['switch.kitchen']).toBe('Pantry Light');
    expect(postBody.settings.deviceGroups[0].name).toBe('Kitchen');

    await server.close();
  });
});
