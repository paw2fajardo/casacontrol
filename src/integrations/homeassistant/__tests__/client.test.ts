import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomeAssistantClient } from '../client.js';

describe('HomeAssistantClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('checkHealth', () => {
    it('returns ok: true when HA root returns 200 with message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'API running.' }),
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
        authToken: 'test-token',
      });

      const res = await client.checkHealth();
      expect(res.ok).toBe(true);
      expect(res.message).toBe('API running.');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://homeassistant.local:8123/api/',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('returns ok: false on 401 Unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
        authToken: 'invalid-token',
      });

      const res = await client.checkHealth();
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Unauthorized/i);
    });

    it('returns ok: false on 500 server error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.checkHealth();
      expect(res.ok).toBe(false);
      expect(res.error).toContain('500');
    });

    it('handles timeout (AbortError) safely', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
        timeoutMs: 100,
      });

      const res = await client.checkHealth();
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/timed out/i);
    });

    it('handles network failure safely', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.checkHealth();
      expect(res.ok).toBe(false);
      expect(res.error).toBe('ECONNREFUSED');
    });
  });

  describe('getStates', () => {
    it('returns list of entities successfully', async () => {
      const mockEntities = [
        {
          entity_id: 'light.living_room',
          state: 'on',
          attributes: { brightness: 255, friendly_name: 'Living Room Light' },
        },
        {
          entity_id: 'lock.front_door',
          state: 'locked',
          attributes: { friendly_name: 'Front Door' },
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEntities,
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
        authToken: 'test-token',
      });

      const res = await client.getStates();
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(res.entities).toHaveLength(2);
      expect(res.entities[0].entity_id).toBe('light.living_room');
      expect(res.entities[0].state).toBe('on');
      expect(res.entities[1].entity_id).toBe('lock.front_door');
      expect(res.entities[1].state).toBe('locked');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://homeassistant.local:8123/api/states',
        expect.anything()
      );
    });

    it('handles 401 Unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.getStates();
      expect(res.success).toBe(false);
      expect(res.entities).toEqual([]);
      expect(res.count).toBe(0);
      expect(res.error).toMatch(/Unauthorized/i);
    });

    it('handles malformed JSON payload', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token <');
        },
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.getStates();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Malformed JSON/i);
    });

    it('handles non-array response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ error: 'something' }),
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.getStates();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Expected array/i);
    });

    it('handles network timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.getStates();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/timed out/i);
    });
  });

  describe('callService', () => {
    it('executes service call successfully with payload', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ entity_id: 'switch.coffee_maker', state: 'on' }],
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
        authToken: 'token123',
      });

      const res = await client.callService('switch', 'turn_on', {
        entity_id: 'switch.coffee_maker',
      });

      expect(res.success).toBe(true);
      expect(res.result).toEqual([{ entity_id: 'switch.coffee_maker', state: 'on' }]);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://homeassistant.local:8123/api/services/switch/turn_on',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ entity_id: 'switch.coffee_maker' }),
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('returns error on 401 Unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.callService('lock', 'unlock', {
        entity_id: 'lock.front_door',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Unauthorized/i);
    });

    it('returns error on 500 server error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.callService('light', 'turn_on');
      expect(res.success).toBe(false);
      expect(res.error).toContain('500');
    });

    it('handles timeout when calling service', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const client = new HomeAssistantClient({
        baseUrl: 'http://homeassistant.local:8123',
      });

      const res = await client.callService('cover', 'open_cover');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/timed out/i);
    });
  });
});
