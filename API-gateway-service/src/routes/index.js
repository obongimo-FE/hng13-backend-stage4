import healthRoutes from './health.js';
import notificationRoutes from './notifications.js';

/**
 * Main Routes Registry - Only imports and registers routes
 */
export default async function routes(fastify, options) {
  // Register health routes
  await fastify.register(healthRoutes);
  
  // Register notification routes with prefix
  await fastify.register(notificationRoutes, { prefix: '/api/v1' });
}