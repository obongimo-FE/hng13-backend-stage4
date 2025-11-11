import healthRoutes from './health.routes.js';
import notificationRoutes from './notification.routes.js';

export default async function routes(fastify, options) {
  // Register routes (similar to Express app.use())
  await fastify.register(healthRoutes);
  await fastify.register(notificationRoutes, { prefix: '/api' });
}