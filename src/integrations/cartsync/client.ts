import type {
  CartSyncClientOptions,
  CartSyncHealthResult,
  CartSyncItemsResult,
  CartSyncItem,
} from './types.js';

export class CartSyncClient {
  private readonly baseUrl: string;
  private readonly authToken?: string;
  private readonly timeoutMs: number;

  constructor(options: CartSyncClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.authToken = options.authToken;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.authToken && this.authToken.trim() !== '') {
      headers['Authorization'] = `Bearer ${this.authToken.trim()}`;
    }
    return headers;
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async checkHealth(): Promise<CartSyncHealthResult> {
    const endpoint = `${this.baseUrl}/api/health`;
    try {
      const res = await this.fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        return {
          ok: false,
          error: `Health check failed with HTTP ${res.status}: ${res.statusText}`,
        };
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        return {
          ok: false,
          error: 'Malformed JSON response from health endpoint',
        };
      }

      const version = typeof data?.version === 'string' ? data.version : undefined;
      return {
        ok: true,
        version,
        details: data,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { ok: false, error: `Health check timed out after ${this.timeoutMs}ms` };
      }
      return {
        ok: false,
        error: err?.message || 'Network error during health check',
      };
    }
  }

  async getActiveItems(): Promise<CartSyncItemsResult> {
    const endpoint = `${this.baseUrl}/api/v1/items?status=active&completed=false`;
    try {
      const res = await this.fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (res.status === 401) {
        return {
          success: false,
          items: [],
          count: 0,
          error: 'Unauthorized: invalid or missing authentication token',
        };
      }

      if (!res.ok) {
        return {
          success: false,
          items: [],
          count: 0,
          error: `Request failed with HTTP ${res.status}: ${res.statusText}`,
        };
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        return {
          success: false,
          items: [],
          count: 0,
          error: 'Malformed JSON response from items endpoint',
        };
      }

      let rawItems: any[] = [];
      if (Array.isArray(data?.items)) {
        rawItems = data.items;
      } else if (Array.isArray(data)) {
        rawItems = data;
      }

      const items: CartSyncItem[] = rawItems.map((item) => ({
        id: item?.id,
        name: typeof item?.name === 'string' ? item.name : String(item?.name ?? ''),
        quantity: typeof item?.quantity === 'number' ? item.quantity : (item?.quantity ? Number(item.quantity) || undefined : undefined),
        unit: item?.unit ? String(item.unit) : undefined,
        category: item?.category ? String(item.category) : undefined,
        note: item?.note ? String(item.note) : undefined,
        completed: Boolean(item?.completed),
        status: item?.status ? String(item.status) : undefined,
        ...item,
      }));

      const count = typeof data?.count === 'number' ? data.count : items.length;

      return {
        success: true,
        items,
        count,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          items: [],
          count: 0,
          error: `Request timed out after ${this.timeoutMs}ms`,
        };
      }
      return {
        success: false,
        items: [],
        count: 0,
        error: err?.message || 'Network error while fetching items',
      };
    }
  }
}
