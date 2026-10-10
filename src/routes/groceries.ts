import type { FastifyPluginAsync } from 'fastify';
import { CartSyncClient } from '../integrations/cartsync/client.js';
import type { CartSyncItemsResult } from '../integrations/cartsync/types.js';
import { config } from '../config/index.js';

export interface GroceryRouteOptions {
  cartSyncClient?: {
    getActiveItems: () => Promise<CartSyncItemsResult>;
  };
}

export const groceryRoutes: FastifyPluginAsync<GroceryRouteOptions> = async (
  fastify,
  options
) => {
  const client =
    options?.cartSyncClient ||
    new CartSyncClient({
      baseUrl: config.CARTSYNC_BASE_URL,
      authToken: config.CARTSYNC_AUTH_TOKEN,
    });

  fastify.get('/api/groceries', async (_request, reply) => {
    try {
      const result = await client.getActiveItems();
      return reply.code(result.success ? 200 : 502).send(result);
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        items: [],
        count: 0,
        error: err?.message || 'Internal server error while fetching groceries',
      });
    }
  });
};
