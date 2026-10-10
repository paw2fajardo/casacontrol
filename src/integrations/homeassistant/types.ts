export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id: string;
    parent_id?: string | null;
    user_id?: string | null;
  };
}

export interface HAClientOptions {
  baseUrl: string;
  authToken?: string;
  timeoutMs?: number;
}

export interface HAHealthResult {
  ok: boolean;
  message?: string;
  error?: string;
}

export interface HAStatesResult {
  success: boolean;
  entities: HAEntityState[];
  count: number;
  error?: string;
}

export interface HAServiceCallResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface ActionValidationResult {
  allowed: boolean;
  requiresConfirmation?: boolean;
  message?: string;
}

export interface HAActionRequestBody {
  entity_id: string;
  domain: string;
  service: string;
  service_data?: Record<string, any>;
  confirmed?: boolean;
}
