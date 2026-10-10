import type {
  GoogleClientOptions,
  GoogleTokenResponse,
  ScheduleItem,
  CalendarEventsResult,
  TasksResult,
  UnifiedScheduleResult,
} from './types.js';

export class GoogleClient {
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly refreshToken?: string;
  private readonly timeoutMs: number;

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0; // timestamp in ms

  constructor(options: GoogleClientOptions = {}) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.refreshToken = options.refreshToken;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  private hasCredentials(): boolean {
    return Boolean(
      this.clientId &&
      this.clientSecret &&
      this.refreshToken &&
      this.clientId.trim() !== '' &&
      this.clientSecret.trim() !== '' &&
      this.refreshToken.trim() !== ''
    );
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

  /**
   * Refreshes or retrieves valid cached OAuth2 access token.
   */
  async getAccessToken(): Promise<string> {
    if (!this.hasCredentials()) {
      throw new Error('Missing Google OAuth credentials (clientId, clientSecret, or refreshToken)');
    }

    // Reuse cached token if it has at least 60 seconds of validity left
    const now = Date.now();
    if (this.cachedAccessToken && this.tokenExpiresAt - now > 60000) {
      return this.cachedAccessToken;
    }

    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      refresh_token: this.refreshToken!,
      grant_type: 'refresh_token',
    });

    let res: Response;
    try {
      res = await this.fetchWithTimeout(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`Token refresh timed out after ${this.timeoutMs}ms`);
      }
      throw new Error(`Network error during token refresh: ${err?.message || err}`);
    }

    if (!res.ok) {
      let errBody = '';
      try {
        const json = (await res.json()) as any;
        errBody = json.error_description || json.error || JSON.stringify(json);
      } catch {
        errBody = await res.text().catch(() => res.statusText);
      }
      throw new Error(`Google token refresh failed (HTTP ${res.status}): ${errBody}`);
    }

    let tokenData: GoogleTokenResponse;
    try {
      tokenData = (await res.json()) as GoogleTokenResponse;
    } catch {
      throw new Error('Malformed JSON response during token refresh');
    }

    if (!tokenData.access_token) {
      throw new Error('No access_token returned by Google OAuth server');
    }

    this.cachedAccessToken = tokenData.access_token;
    // expires_in is in seconds
    const expiresInMs = (tokenData.expires_in || 3600) * 1000;
    this.tokenExpiresAt = Date.now() + expiresInMs;

    return this.cachedAccessToken;
  }

  /**
   * Fetches calendar events from the primary calendar within the specified range.
   */
  async fetchCalendarEvents(timeMin?: string, timeMax?: string): Promise<CalendarEventsResult> {
    if (!this.hasCredentials()) {
      return {
        success: false,
        events: [],
        error: 'Google credentials are not configured',
      };
    }

    let accessToken: string;
    try {
      accessToken = await this.getAccessToken();
    } catch (err: any) {
      return {
        success: false,
        events: [],
        error: err?.message || 'Failed to obtain access token',
      };
    }

    // Default timeMin to start of current day if not provided
    const min = timeMin || new Date().toISOString();
    const query = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin: min,
      maxResults: '100',
    });
    if (timeMax) {
      query.set('timeMax', timeMax);
    }

    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${query.toString()}`;

    try {
      const res = await this.fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        let errDesc = '';
        try {
          const errJson = (await res.json()) as any;
          errDesc = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errDesc = res.statusText;
        }
        return {
          success: false,
          events: [],
          error: `Google Calendar API error (HTTP ${res.status}): ${errDesc}`,
        };
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        return {
          success: false,
          events: [],
          error: 'Malformed JSON response from Google Calendar API',
        };
      }

      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const events: ScheduleItem[] = rawItems
        .filter((item: any) => item.status !== 'cancelled')
        .map((item: any) => {
          const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
          const start = item.start?.dateTime || item.start?.date || '';
          const end = item.end?.dateTime || item.end?.date || undefined;

          return {
            id: `cal_${item.id}`,
            title: item.summary || '(No title)',
            type: 'calendar' as const,
            start,
            end,
            allDay: isAllDay,
            location: item.location || undefined,
            description: item.description || undefined,
            status: item.status || 'confirmed',
            source: 'Google Calendar',
            link: item.htmlLink || undefined,
          };
        });

      return {
        success: true,
        events,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          events: [],
          error: `Google Calendar request timed out after ${this.timeoutMs}ms`,
        };
      }
      return {
        success: false,
        events: [],
        error: err?.message || 'Network error fetching Google Calendar events',
      };
    }
  }

  /**
   * Fetches uncompleted tasks across all task lists for the user.
   */
  async fetchTasks(): Promise<TasksResult> {
    if (!this.hasCredentials()) {
      return {
        success: false,
        tasks: [],
        error: 'Google credentials are not configured',
      };
    }

    let accessToken: string;
    try {
      accessToken = await this.getAccessToken();
    } catch (err: any) {
      return {
        success: false,
        tasks: [],
        error: err?.message || 'Failed to obtain access token',
      };
    }

    try {
      // 1. Fetch task lists
      const listsEndpoint = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
      const listsRes = await this.fetchWithTimeout(listsEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!listsRes.ok) {
        let errDesc = '';
        try {
          const errJson = (await listsRes.json()) as any;
          errDesc = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errDesc = listsRes.statusText;
        }
        return {
          success: false,
          tasks: [],
          error: `Google Tasks API error fetching lists (HTTP ${listsRes.status}): ${errDesc}`,
        };
      }

      let listsData: any;
      try {
        listsData = await listsRes.json();
      } catch {
        return {
          success: false,
          tasks: [],
          error: 'Malformed JSON response from Google Tasks lists API',
        };
      }

      const lists = Array.isArray(listsData?.items) ? listsData.items : [];
      if (lists.length === 0) {
        return {
          success: true,
          tasks: [],
        };
      }

      // 2. Fetch uncompleted tasks for each list
      const allTasks: ScheduleItem[] = [];

      for (const list of lists) {
        const listTitle = list.title || 'Tasks';
        const tasksEndpoint = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=false`;

        const tasksRes = await this.fetchWithTimeout(tasksEndpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (!tasksRes.ok) {
          // If individual list fails, skip or log, continue with other lists
          continue;
        }

        let tasksData: any;
        try {
          tasksData = await tasksRes.json();
        } catch {
          continue;
        }

        const rawTasks = Array.isArray(tasksData?.items) ? tasksData.items : [];
        for (const task of rawTasks) {
          if (task.status === 'completed' || task.hidden) {
            continue;
          }

          const due = task.due || undefined;
          const start = due || task.updated || new Date().toISOString();

          allTasks.push({
            id: `task_${task.id}`,
            title: task.title || '(No title)',
            type: 'task' as const,
            start,
            allDay: Boolean(due && due.includes('T00:00:00.000Z')),
            description: task.notes || undefined,
            status: task.status || 'needsAction',
            source: listTitle,
            link: task.webViewLink || undefined,
          });
        }
      }

      return {
        success: true,
        tasks: allTasks,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          tasks: [],
          error: `Google Tasks request timed out after ${this.timeoutMs}ms`,
        };
      }
      return {
        success: false,
        tasks: [],
        error: err?.message || 'Network error fetching Google Tasks',
      };
    }
  }

  /**
   * Combines calendar events and active tasks into a single chronological schedule list.
   */
  async getUnifiedSchedule(timeMin?: string, timeMax?: string): Promise<UnifiedScheduleResult> {
    if (!this.hasCredentials()) {
      return {
        success: false,
        items: [],
        count: 0,
        error: 'Google credentials are not configured',
      };
    }

    const [calendarResult, tasksResult] = await Promise.all([
      this.fetchCalendarEvents(timeMin, timeMax),
      this.fetchTasks(),
    ]);

    // If both failed, report error
    if (!calendarResult.success && !tasksResult.success) {
      return {
        success: false,
        items: [],
        count: 0,
        error: `Schedule fetch failed. Calendar: ${calendarResult.error}; Tasks: ${tasksResult.error}`,
      };
    }

    const combined: ScheduleItem[] = [
      ...(calendarResult.success ? calendarResult.events : []),
      ...(tasksResult.success ? tasksResult.tasks : []),
    ];

    // Sort chronologically ascending by start
    combined.sort((a, b) => {
      const timeA = new Date(a.start).getTime();
      const timeB = new Date(b.start).getTime();

      if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
      if (Number.isNaN(timeA)) return 1;
      if (Number.isNaN(timeB)) return -1;
      return timeA - timeB;
    });

    const partialErrors: string[] = [];
    if (!calendarResult.success) partialErrors.push(`Calendar: ${calendarResult.error}`);
    if (!tasksResult.success) partialErrors.push(`Tasks: ${tasksResult.error}`);

    return {
      success: true,
      items: combined,
      count: combined.length,
      error: partialErrors.length > 0 ? partialErrors.join(' | ') : undefined,
    };
  }
}
