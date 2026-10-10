import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CartSyncClient } from '../client.js';

describe('CartSyncClient', () => {
  const baseUrl = 'http://cartsync.lan:9090';
  const authToken = 'test-secret-token';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor & headers', () => {
    it('trims trailing slashes from baseUrl', () => {
      const client = new CartSyncClient({ baseUrl: 'http://cartsync.lan:9090///' });
      expect((client as any).baseUrl).toBe('http://cartsync.lan:9090');
    });

    it('includes Authorization header if authToken provided', async () => {
      const client = new CartSyncClient({ baseUrl, authToken });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ version: '1.2.0' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await client.checkHealth();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toBe('http://cartsync.lan:9090/api/health');
      expect(callArgs[1].headers).toEqual({
        Accept: 'application/json',
        Authorization: 'Bearer test-secret-token',
      });
    });

    it('does not include Authorization header if authToken is not provided', async () => {
      const client = new CartSyncClient({ baseUrl });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ version: '1.2.0' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await client.checkHealth();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers).toEqual({
        Accept: 'application/json',
      });
    });
  });

  describe('checkHealth', () => {
    it('returns ok: true with version and details on success', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ status: 'healthy', version: '2.4.1' }),
        })
      );

      const res = await client.checkHealth();
      expect(res.ok).toBe(true);
      expect(res.version).toBe('2.4.1');
      expect(res.details).toEqual({ status: 'healthy', version: '2.4.1' });
    });

    it('returns ok: false on HTTP error status', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
      );

      const res = await client.checkHealth();
      expect(res.ok).toBe(false);
      expect(res.error).toContain('503');
    });

    it('returns ok: false on malformed JSON', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Unexpected token < in JSON');
          },
        })
      );

      const res = await client.checkHealth();
      expect(res.ok).toBe(false);
      expect(res.error).toBe('Malformed JSON response from health endpoint');
    });

    it('returns ok: false on network timeout / abort', async () => {
      const client = new CartSyncClient({ baseUrl, timeoutMs: 100 });
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(abortError)
      );

      const res = await client.checkHealth();
      expect(res.ok).toBe(false);
      expect(res.error).toContain('timed out');
    });

    it('returns ok: false on network error', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
      );

      const res = await client.checkHealth();
      expect(res.ok).toBe(false);
      expect(res.error).toBe('ECONNREFUSED');
    });
  });

  describe('getActiveItems', () => {
    it('fetches items from correct endpoint and normalizes results', async () => {
      const client = new CartSyncClient({ baseUrl, authToken });
      const rawPayload = {
        count: 2,
        items: [
          { id: '1', name: 'Apples', quantity: 3, unit: 'pcs', category: 'Produce', completed: false, status: 'active' },
          { id: '2', name: 'Oat Milk', quantity: 1, unit: 'carton', category: 'Dairy', completed: false, status: 'active' },
        ],
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => rawPayload,
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await client.getActiveItems();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://cartsync.lan:9090/api/v1/items?status=active&completed=false',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer test-secret-token',
          },
        })
      );

      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(res.items).toHaveLength(2);
      expect(res.items[0]).toMatchObject({
        id: '1',
        name: 'Apples',
        quantity: 3,
        unit: 'pcs',
        category: 'Produce',
        completed: false,
      });
    });

    it('handles empty items array successfully', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ count: 0, items: [] }),
        })
      );

      const res = await client.getActiveItems();
      expect(res.success).toBe(true);
      expect(res.count).toBe(0);
      expect(res.items).toEqual([]);
    });

    it('handles HTTP 401 Unauthorized resiliently', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        })
      );

      const res = await client.getActiveItems();
      expect(res.success).toBe(false);
      expect(res.items).toEqual([]);
      expect(res.count).toBe(0);
      expect(res.error).toBe('Unauthorized: invalid or missing authentication token');
    });

    it('handles HTTP 500 Internal Server Error resiliently', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      const res = await client.getActiveItems();
      expect(res.success).toBe(false);
      expect(res.items).toEqual([]);
      expect(res.count).toBe(0);
      expect(res.error).toContain('500');
    });

    it('handles malformed JSON payload resiliently', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Invalid JSON syntax');
          },
        })
      );

      const res = await client.getActiveItems();
      expect(res.success).toBe(false);
      expect(res.items).toEqual([]);
      expect(res.count).toBe(0);
      expect(res.error).toBe('Malformed JSON response from items endpoint');
    });

    it('handles network offline / connection failure resiliently', async () => {
      const client = new CartSyncClient({ baseUrl });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network offline or host unreachable'))
      );

      const res = await client.getActiveItems();
      expect(res.success).toBe(false);
      expect(res.items).toEqual([]);
      expect(res.count).toBe(0);
      expect(res.error).toBe('Network offline or host unreachable');
    });

    it('handles timeout resiliently', async () => {
      const client = new CartSyncClient({ baseUrl, timeoutMs: 100 });
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(abortError)
      );

      const res = await client.getActiveItems();
      expect(res.success).toBe(false);
      expect(res.items).toEqual([]);
      expect(res.count).toBe(0);
      expect(res.error).toContain('Request timed out after 100ms');
    });
  });
});
