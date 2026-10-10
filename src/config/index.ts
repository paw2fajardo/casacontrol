export interface AppConfig {
  PORT: number;
  HOST: string;
  NODE_ENV: string;
  CARTSYNC_BASE_URL: string;
  CARTSYNC_AUTH_TOKEN?: string;
  HOMEASSISTANT_BASE_URL?: string;
  HOMEASSISTANT_AUTH_TOKEN?: string;
  [key: string]: string | number | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const portParsed = env.PORT ? parseInt(env.PORT, 10) : 3000;
  const port = Number.isNaN(portParsed) ? 3000 : portParsed;

  return {
    PORT: port,
    HOST: env.HOST || '0.0.0.0',
    NODE_ENV: env.NODE_ENV || 'development',
    CARTSYNC_BASE_URL: env.CARTSYNC_BASE_URL || 'http://cartsync:3001',
    CARTSYNC_AUTH_TOKEN: env.CARTSYNC_AUTH_TOKEN || undefined,
    HOMEASSISTANT_BASE_URL: env.HOMEASSISTANT_BASE_URL || undefined,
    HOMEASSISTANT_AUTH_TOKEN: env.HOMEASSISTANT_AUTH_TOKEN || undefined,
  };
}

const SECRET_KEY_PATTERNS = [/SECRET/i, /TOKEN/i, /KEY/i, /PASSWORD/i, /AUTH/i];

export function maskSecrets(config: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};

  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null) {
      masked[key] = value;
      continue;
    }

    const isSecret = SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSecret && typeof value === 'string' && value.length > 0) {
      masked[key] = '***';
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

export const config = loadConfig();
