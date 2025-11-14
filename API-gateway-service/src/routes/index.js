import healthRoutes from './health-routes.js';
import notificationRoutes from './notification-routes.js';
import userServiceRoutes from './user-service-routes.js';
import templateServiceRoutes from './template-service-routes.js';

export default async function routes(fastify, options) {
  // Register health routes
  await fastify.register(healthRoutes);
  
  // Register notification routes with prefix
  await fastify.register(notificationRoutes, { prefix: '/api/v1' });
  
  // Register documentation routes for other services (Swagger documentation only)
  await fastify.register(userServiceRoutes, { prefix: '/api/v1' });
  await fastify.register(templateServiceRoutes, { prefix: '/api/v1' });
  
  fastify.log.info('All routes registered successfully');
}