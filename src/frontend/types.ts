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
