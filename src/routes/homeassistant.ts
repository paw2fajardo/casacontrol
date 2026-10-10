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
};
