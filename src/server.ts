import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config, maskSecrets, AppConfig } from './config/index.js';
import { healthRoutes } from './routes/health.js';
import { groceryRoutes, GroceryRouteOptions } from './routes/groceries.js';
import { homeassistantRoutes, HomeAssistantRouteOptions } from './routes/homeassistant.js';
import { scheduleRoutes, ScheduleRouteOptions } from './routes/schedule.js';

import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to public static directory (works both in development src/ and production dist/)
const publicPath = path.resolve(__dirname, '../public');

export interface BuildServerOptions {
  config?: AppConfig;
  cartSyncClient?: GroceryRouteOptions['cartSyncClient'];
  haClient?: HomeAssistantRouteOptions['haClient'];
  googleClient?: ScheduleRouteOptions['googleClient'];
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  // Enable CORS
  await server.register(cors, {
    origin: true,
  });

  // Serve static UI assets for tablets
  await server.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
  });

  // Register API routes
  await server.register(healthRoutes);
  await server.register(groceryRoutes, {
    cartSyncClient: options.cartSyncClient,
  });
  await server.register(homeassistantRoutes, {
    haClient: options.haClient,
  });
  await server.register(scheduleRoutes, {
    googleClient: options.googleClient,
  });

  // SPA fallback for HTML5 History API routes (/home, /security, /schedule, /groceries)
  server.setNotFoundHandler((request, reply) => {
    if (request.raw.url && request.raw.url.startsWith('/api')) {
      return reply.code(404).send({ error: 'Not Found', message: `Route ${request.method}:${request.url} not found` });
    }
    return reply.sendFile('index.html');
  });

  return server;
}

export async function startServer(): Promise<FastifyInstance> {
  const currentConfig = config;
  const server = await buildServer({ config: currentConfig });

  server.log.info({ config: maskSecrets(currentConfig) }, 'Starting server with configuration');

  try {
    await server.listen({
      port: currentConfig.PORT,
      host: currentConfig.HOST,
    });
    return server;
  } catch (err) {
    server.log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Self-start if executed directly
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isDirectRun) {
  startServer();
}
