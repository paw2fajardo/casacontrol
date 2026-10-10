import type { FastifyPluginAsync } from 'fastify';
import { HomeAssistantClient } from '../integrations/homeassistant/client.js';
import { validateActionRequest } from '../integrations/homeassistant/safety.js';
import type {
  HAStatesResult,
  HAServiceCallResult,
  HAActionRequestBody,
} from '../integrations/homeassistant/types.js';
import { config } from '../config/index.js';

export interface HomeAssistantRouteOptions {
  haClient?: {
    getStates: () => Promise<HAStatesResult>;
    callService: (
      domain: string,
      service: string,
      serviceData?: Record<string, any>
    ) => Promise<HAServiceCallResult>;
  };
}

export const homeassistantRoutes: FastifyPluginAsync<HomeAssistantRouteOptions> = async (
  fastify,
  options
) => {
  const client =
    options?.haClient ||
    new HomeAssistantClient({
      baseUrl: config.HOMEASSISTANT_BASE_URL || '',
      authToken: config.HOMEASSISTANT_AUTH_TOKEN,
    });

  // GET /api/homeassistant/entities
  fastify.get('/api/homeassistant/entities', async (_request, reply) => {
    try {
      const result = await client.getStates();
      return reply.code(result.success ? 200 : 502).send(result);
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        entities: [],
        count: 0,
        error: err?.message || 'Internal server error while fetching entities',
      });
    }
  });

  // POST /api/homeassistant/action
  fastify.post<{ Body: HAActionRequestBody }>(
    '/api/homeassistant/action',
    async (request, reply) => {
      try {
        const body = request.body || ({} as Partial<HAActionRequestBody>);
        const { entity_id, domain, service, service_data, confirmed } = body;

        // Fetch entity state/attributes if available to accurately check device_class for garage covers
        let entityAttributes: Record<string, any> | undefined;
        try {
          const statesResult = await client.getStates();
          if (statesResult.success && statesResult.entities) {
            const found = statesResult.entities.find((e) => e.entity_id === entity_id);
            if (found) {
              entityAttributes = found.attributes;
            }
          }
        } catch {
          // If state fetching fails, safety validator will still use entity_id name/domain inspection
        }

        const validation = validateActionRequest(
          { entity_id, domain, service, confirmed },
          entityAttributes
        );

        if (!validation.allowed) {
          if (validation.requiresConfirmation) {
            return reply.code(400).send({
              success: false,
              requiresConfirmation: true,
              message: validation.message,
            });
          }
          return reply.code(400).send({
            success: false,
            error: validation.message,
          });
        }

        // Call service
        const payloadData = {
          entity_id,
          ...(service_data || {}),
        };

        const result = await client.callService(domain, service, payloadData);
        return reply.code(result.success ? 200 : 502).send(result);
      } catch (err: any) {
        return reply.code(500).send({
          success: false,
          error: err?.message || 'Internal server error while executing action',
        });
      }
    }
  );

  // GET /api/homeassistant/camera/snapshot/:entityId
  fastify.get<{ Params: { entityId: string } }>(
    '/api/homeassistant/camera/snapshot/:entityId',
    async (request, reply) => {
      const { entityId } = request.params;
      const baseUrl = (config.HOMEASSISTANT_BASE_URL || '').replace(/\/+$/, '');
      const token = (config.HOMEASSISTANT_AUTH_TOKEN || '').trim();

      if (!baseUrl) {
        return reply.code(502).send({ error: 'Home Assistant base URL not configured' });
      }

      try {
        const response = await fetch(`${baseUrl}/api/camera_proxy/${encodeURIComponent(entityId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          return reply.code(response.status).send({ error: `HA returned ${response.status}` });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        return reply
          .header('Content-Type', contentType)
          .header('Cache-Control', 'no-cache, no-store, must-revalidate')
          .send(Buffer.from(buffer));
      } catch (err: any) {
        return reply.code(502).send({ error: err?.message || 'Failed to fetch camera snapshot' });
      }
    }
  );

  // GET /api/homeassistant/camera/stream/:entityId
  fastify.get<{ Params: { entityId: string } }>(
    '/api/homeassistant/camera/stream/:entityId',
    async (request, reply) => {
      const { entityId } = request.params;
      const baseUrl = (config.HOMEASSISTANT_BASE_URL || '').replace(/\/+$/, '');
      const token = (config.HOMEASSISTANT_AUTH_TOKEN || '').trim();

      if (!baseUrl) {
        return reply.code(502).send({ error: 'Home Assistant base URL not configured' });
      }

      try {
        const controller = new AbortController();
        request.raw.on('close', () => {
          controller.abort();
        });

        const response = await fetch(`${baseUrl}/api/camera_proxy_stream/${encodeURIComponent(entityId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          return reply.code(response.status).send({ error: `HA stream returned ${response.status}` });
        }

        const contentType = response.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=ffmpeg';
        reply.raw.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Connection': 'close',
          'Pragma': 'no-cache',
        });

        const reader = response.body.getReader();
        const pump = async () => {
          try {
            while (!request.raw.destroyed) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                reply.raw.write(Buffer.from(value));
              }
            }
          } catch {
            // Client closed connection or aborted
          } finally {
            reply.raw.end();
            reader.cancel().catch(() => {});
          }
        };

        pump();
        return reply;
      } catch (err: any) {
        return reply.code(502).send({ error: err?.message || 'Failed to connect camera stream' });
      }
    }
  );
};
