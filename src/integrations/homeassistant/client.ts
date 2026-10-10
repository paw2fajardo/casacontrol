import type {
  HAClientOptions,
  HAHealthResult,
  HAStatesResult,
  HAServiceCallResult,
  HAEntityState,
} from './types.js';

export class HomeAssistantClient {
  private readonly baseUrl: string;
  private readonly authToken?: string;
  private readonly timeoutMs: number;

  constructor(options: HAClientOptions) {
    this.baseUrl = (options.baseUrl || '').replace(/\/+$/, '');
    this.authToken = options.authToken;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
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

  async checkHealth(): Promise<HAHealthResult> {
    if (!this.baseUrl) {
      return { ok: false, error: 'Base URL is not configured' };
    }

    const endpoint = `${this.baseUrl}/api/`;
    try {
      const res = await this.fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (res.status === 401) {
        return {
          ok: false,
          error: 'Unauthorized: invalid or missing Home Assistant token',
        };
      }

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
          error: 'Malformed JSON response from Home Assistant API root',
        };
      }

      return {
        ok: true,
        message: typeof data?.message === 'string' ? data.message : 'API running.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          ok: false,
          error: `Health check timed out after ${this.timeoutMs}ms`,
        };
      }
      return {
        ok: false,
        error: err?.message || 'Network error during Home Assistant health check',
      };
    }
  }

  async getStates(): Promise<HAStatesResult> {
    if (!this.baseUrl) {
      return {
        success: false,
        entities: [],
        count: 0,
        error: 'Base URL is not configured',
      };
    }

    const endpoint = `${this.baseUrl}/api/states`;
    try {
      const res = await this.fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (res.status === 401) {
        return {
          success: false,
          entities: [],
          count: 0,
          error: 'Unauthorized: invalid or missing Home Assistant token',
        };
      }

      if (!res.ok) {
        return {
          success: false,
          entities: [],
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
          entities: [],
          count: 0,
          error: 'Malformed JSON response from states endpoint',
        };
      }

      if (!Array.isArray(data)) {
        return {
          success: false,
          entities: [],
          count: 0,
          error: 'Expected array of entity states from states endpoint',
        };
      }

      const entities: HAEntityState[] = data.map((item) => ({
        entity_id: item?.entity_id || '',
        state: String(item?.state ?? ''),
        attributes: (item?.attributes && typeof item.attributes === 'object') ? item.attributes : {},
        last_changed: item?.last_changed,
        last_updated: item?.last_updated,
        context: item?.context,
      }));

      return {
        success: true,
        entities,
        count: entities.length,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          entities: [],
          count: 0,
          error: `Request timed out after ${this.timeoutMs}ms`,
        };
      }
      return {
        success: false,
        entities: [],
        count: 0,
        error: err?.message || 'Network error while fetching entity states',
      };
    }
  }

  async callService(
    domain: string,
    service: string,
    serviceData?: Record<string, any>
  ): Promise<HAServiceCallResult> {
    if (!this.baseUrl) {
      return {
        success: false,
        error: 'Base URL is not configured',
      };
    }

    const endpoint = `${this.baseUrl}/api/services/${domain}/${service}`;
    try {
      const res = await this.fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(serviceData ?? {}),
      });

      if (res.status === 401) {
        return {
          success: false,
          error: 'Unauthorized: invalid or missing Home Assistant token',
        };
      }

      if (!res.ok) {
        return {
          success: false,
          error: `Service call failed with HTTP ${res.status}: ${res.statusText}`,
        };
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        // Some HA service calls return empty or non-JSON responses
        data = null;
      }

      return {
        success: true,
        result: data,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          error: `Service call timed out after ${this.timeoutMs}ms`,
        };
      }
      return {
        success: false,
        error: err?.message || 'Network error while executing service call',
      };
    }
  }
}
