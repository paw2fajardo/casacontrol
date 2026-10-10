export interface CartSyncItem {
  id: string | number;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  note?: string;
  completed: boolean;
  status?: string;
  [key: string]: any;
}

export interface CartSyncClientOptions {
  baseUrl: string;
  authToken?: string;
  timeoutMs?: number;
}

export interface CartSyncHealthResult {
  ok: boolean;
  version?: string;
  details?: any;
  error?: string;
}

export interface CartSyncItemsResult {
  success: boolean;
  items: CartSyncItem[];
  count: number;
  error?: string;
}
