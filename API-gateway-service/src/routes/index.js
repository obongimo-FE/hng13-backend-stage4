import healthRoutes from './health-routes.js';
import notificationRoutes from './notification-routes.js';

export default async function routes(fastify, options) {
  // Register health routes
  await fastify.register(healthRoutes);
  
  // Register notification routes with prefix
  await fastify.register(notificationRoutes, { prefix: '/api/v1' });
  
  fastify.log.info('All routes registered successfully');
}