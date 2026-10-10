export type ScheduleItemType = 'calendar' | 'task';

export interface ScheduleItem {
  id: string;
  title: string;
  type: ScheduleItemType;
  /** ISO string or date representation of the scheduled start time or due date */
  start: string;
  /** ISO string of the scheduled end time (for calendar events) */
  end?: string;
  /** Whether the item is an all-day event or due date without specific time */
  allDay: boolean;
  /** Optional location (calendar events) */
  location?: string;
  /** Optional description or notes */
  description?: string;
  /** Status of the task or event (e.g. 'confirmed', 'needsAction', 'completed') */
  status?: string;
  /** Name or ID of calendar or task list source */
  source?: string;
  /** Direct link to event or task if available */
  link?: string;
}

export interface GoogleClientOptions {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  timeoutMs?: number;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface CalendarEventsResult {
  success: boolean;
  events: ScheduleItem[];
  error?: string;
}

export interface TasksResult {
  success: boolean;
  tasks: ScheduleItem[];
  error?: string;
}

export interface UnifiedScheduleResult {
  success: boolean;
  items: ScheduleItem[];
  count: number;
  error?: string;
}
