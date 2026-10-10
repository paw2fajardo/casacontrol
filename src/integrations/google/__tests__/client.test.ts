import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleClient } from '../client.js';

describe('GoogleClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Configuration & Credentials', () => {
    it('returns error when credentials are not configured', async () => {
      const client = new GoogleClient();

      const eventsResult = await client.fetchCalendarEvents();
      expect(eventsResult.success).toBe(false);
      expect(eventsResult.error).toContain('not configured');

      const tasksResult = await client.fetchTasks();
      expect(tasksResult.success).toBe(false);
      expect(tasksResult.error).toContain('not configured');

      const unifiedResult = await client.getUnifiedSchedule();
      expect(unifiedResult.success).toBe(false);
      expect(unifiedResult.error).toContain('not configured');
    });

    it('throws error when calling getAccessToken without credentials', async () => {
      const client = new GoogleClient({ clientId: '', clientSecret: '', refreshToken: '' });
      await expect(client.getAccessToken()).rejects.toThrow('Missing Google OAuth credentials');
    });
  });

  describe('Token Refresh', () => {
    it('fetches a new access token via POST oauth2/token and caches it', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'mock-access-token-123',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });
      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'client-id-xyz',
        clientSecret: 'client-secret-abc',
        refreshToken: 'refresh-token-123',
      });

      const token1 = await client.getAccessToken();
      expect(token1).toBe('mock-access-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );

      // Verify request body includes grant_type=refresh_token
      const body = mockFetch.mock.calls[0][1]?.body;
      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('client_id=client-id-xyz');
      expect(body).toContain('refresh_token=refresh-token-123');

      // Subsequent call should reuse cached token without re-fetching
      const token2 = await client.getAccessToken();
      expect(token2).toBe('mock-access-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles token refresh HTTP failure gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Token has been expired or revoked.',
        }),
      });
      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'bad-refresh-token',
      });

      await expect(client.getAccessToken()).rejects.toThrow('Token has been expired or revoked.');
    });

    it('handles network error during token refresh', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));
      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
      });

      await expect(client.getAccessToken()).rejects.toThrow('Network error during token refresh: Network unreachable');
    });

    it('handles malformed JSON during token refresh', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token < in JSON');
        },
      });
      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
      });

      await expect(client.getAccessToken()).rejects.toThrow('Malformed JSON response during token refresh');
    });
  });

  describe('fetchCalendarEvents', () => {
    it('successfully fetches and normalizes calendar events', async () => {
      const mockFetch = vi.fn()
        // 1st call: token refresh
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'calendar-token',
            expires_in: 3600,
          }),
        })
        // 2nd call: calendarList
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              { id: 'primary', summary: 'Google Calendar' },
            ],
          }),
        })
        // 3rd call: calendar events
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: 'event-1',
                summary: 'Family Dinner',
                description: 'At grandma house',
                location: '123 Main St',
                status: 'confirmed',
                start: { dateTime: '2026-10-15T18:00:00Z' },
                end: { dateTime: '2026-10-15T20:00:00Z' },
                htmlLink: 'https://calendar.google.com/event1',
              },
              {
                id: 'event-2',
                summary: 'Trash Collection',
                start: { date: '2026-10-16' },
                end: { date: '2026-10-16' },
                status: 'confirmed',
              },
              {
                id: 'event-3',
                summary: 'Cancelled Meeting',
                status: 'cancelled',
                start: { dateTime: '2026-10-17T10:00:00Z' },
              },
            ],
          }),
        });

      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      const res = await client.fetchCalendarEvents('2026-10-15T00:00:00Z', '2026-10-20T00:00:00Z');

      expect(res.success).toBe(true);
      expect(res.events).toHaveLength(2); // cancelled filtered out

      const event1 = res.events[0];
      expect(event1).toEqual({
        id: 'cal_event-1',
        title: 'Family Dinner',
        type: 'calendar',
        start: '2026-10-15T18:00:00Z',
        end: '2026-10-15T20:00:00Z',
        allDay: false,
        location: '123 Main St',
        description: 'At grandma house',
        status: 'confirmed',
        source: 'Google Calendar',
        link: 'https://calendar.google.com/event1',
      });

      const event2 = res.events[1];
      expect(event2.allDay).toBe(true);
      expect(event2.title).toBe('Trash Collection');
    });

    it('handles Google Calendar API error response', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'valid-token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: 'primary', summary: 'Primary' }] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({
            error: {
              message: 'Rate limit exceeded or Calendar API not enabled',
            },
          }),
        });

      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      const res = await client.fetchCalendarEvents();
      expect(res.success).toBe(false);
      expect(res.error).toContain('Rate limit exceeded');
    });

    it('handles network error during calendar fetch', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'valid-token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: 'primary', summary: 'Primary' }] }),
        })
        .mockRejectedValueOnce(new Error('Connection reset by peer'));

      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      const res = await client.fetchCalendarEvents();
      expect(res.success).toBe(false);
      expect(res.error).toContain('Connection reset by peer');
    });
  });

  describe('fetchTasks', () => {
    it('successfully fetches task lists and active tasks', async () => {
      const mockFetch = vi.fn()
        // token refresh
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'task-token', expires_in: 3600 }),
        })
        // 1. fetch lists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              { id: 'list-1', title: 'Home Chores' },
              { id: 'list-2', title: 'Work' },
            ],
          }),
        })
        // 2. tasks for list-1
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: 'task-101',
                title: 'Clean filters',
                notes: 'HVAC in basement',
                status: 'needsAction',
                due: '2026-10-16T00:00:00.000Z',
                webViewLink: 'https://tasks.google.com/task101',
              },
              {
                id: 'task-102',
                title: 'Already finished task',
                status: 'completed',
              },
            ],
          }),
        })
        // 3. tasks for list-2
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: 'task-201',
                title: 'Call plumber',
                status: 'needsAction',
                updated: '2026-10-15T09:00:00Z',
              },
            ],
          }),
        });

      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      const res = await client.fetchTasks();
      expect(res.success).toBe(true);
      expect(res.tasks).toHaveLength(2); // completed task filtered out

      expect(res.tasks[0]).toEqual({
        id: 'task_task-101',
        title: 'Clean filters',
        type: 'task',
        start: '2026-10-16T00:00:00.000Z',
        allDay: true,
        description: 'HVAC in basement',
        status: 'needsAction',
        source: 'Home Chores',
        link: 'https://tasks.google.com/task101',
      });

      expect(res.tasks[1]).toEqual({
        id: 'task_task-201',
        title: 'Call plumber',
        type: 'task',
        start: '2026-10-15T09:00:00Z',
        allDay: false,
        description: undefined,
        status: 'needsAction',
        source: 'Work',
        link: undefined,
      });
    });

    it('returns empty list if user has no task lists', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'task-token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [] }),
        });

      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      const res = await client.fetchTasks();
      expect(res.success).toBe(true);
      expect(res.tasks).toEqual([]);
    });

    it('handles Google Tasks lists error', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'task-token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({ error: { message: 'Tasks API not enabled' } }),
        });

      global.fetch = mockFetch;

      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      const res = await client.fetchTasks();
      expect(res.success).toBe(false);
      expect(res.error).toContain('Tasks API not enabled');
    });
  });

  describe('getUnifiedSchedule', () => {
    it('combines calendar events and tasks and sorts them chronologically', async () => {
      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      // Mock fetchCalendarEvents & fetchTasks directly on instance
      vi.spyOn(client, 'fetchCalendarEvents').mockResolvedValue({
        success: true,
        events: [
          {
            id: 'cal_2',
            title: 'Afternoon Doctor Appointment',
            type: 'calendar',
            start: '2026-10-15T14:00:00Z',
            allDay: false,
          },
          {
            id: 'cal_1',
            title: 'Morning Yoga',
            type: 'calendar',
            start: '2026-10-15T08:00:00Z',
            allDay: false,
          },
        ],
      });

      vi.spyOn(client, 'fetchTasks').mockResolvedValue({
        success: true,
        tasks: [
          {
            id: 'task_1',
            title: 'Buy Milk',
            type: 'task',
            start: '2026-10-15T10:00:00Z',
            allDay: false,
          },
        ],
      });

      const unified = await client.getUnifiedSchedule();

      expect(unified.success).toBe(true);
      expect(unified.count).toBe(3);
      expect(unified.items).toHaveLength(3);

      // Verify chronological sorting (08:00 -> 10:00 -> 14:00)
      expect(unified.items[0].title).toBe('Morning Yoga');
      expect(unified.items[1].title).toBe('Buy Milk');
      expect(unified.items[2].title).toBe('Afternoon Doctor Appointment');
    });

    it('returns degraded result with items if one provider succeeds and one fails', async () => {
      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      vi.spyOn(client, 'fetchCalendarEvents').mockResolvedValue({
        success: true,
        events: [
          {
            id: 'cal_1',
            title: 'Team Sync',
            type: 'calendar',
            start: '2026-10-15T09:00:00Z',
            allDay: false,
          },
        ],
      });

      vi.spyOn(client, 'fetchTasks').mockResolvedValue({
        success: false,
        tasks: [],
        error: 'Tasks service unavailable',
      });

      const unified = await client.getUnifiedSchedule();

      expect(unified.success).toBe(true);
      expect(unified.items).toHaveLength(1);
      expect(unified.count).toBe(1);
      expect(unified.error).toContain('Tasks: Tasks service unavailable');
    });

    it('returns failure when both calendar and tasks fail', async () => {
      const client = new GoogleClient({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
      });

      vi.spyOn(client, 'fetchCalendarEvents').mockResolvedValue({
        success: false,
        events: [],
        error: 'Calendar 500 error',
      });

      vi.spyOn(client, 'fetchTasks').mockResolvedValue({
        success: false,
        tasks: [],
        error: 'Tasks 503 error',
      });

      const unified = await client.getUnifiedSchedule();

      expect(unified.success).toBe(false);
      expect(unified.items).toEqual([]);
      expect(unified.count).toBe(0);
      expect(unified.error).toContain('Schedule fetch failed');
    });
  });
});
