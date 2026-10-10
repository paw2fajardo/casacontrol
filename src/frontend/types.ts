export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    brightness?: number;
    current_temperature?: number;
    temperature?: number;
    target_temperature?: number;
    hvac_action?: string;
    device_class?: string;
    unit_of_measurement?: string;
    [key: string]: any;
  };
  last_changed: string;
}

export interface ScheduleItem {
  id: string;
  type: 'calendar' | 'task';
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  location?: string;
  description?: string;
  status?: string;
  source?: string;
  link?: string;
  // Legacy optional aliases for backwards compatibility
  startTime?: string;
  endTime?: string;
  dueDate?: string;
  listName?: string;
  isAllDay?: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  completed: boolean;
}

export interface DeviceGroup {
  id: string;
  name: string;
  entityIds: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'user';
  pin?: string;
  allowedGroupIds: string[];
  hasPin?: boolean;
}

