import { HealthController } from '../controllers/health.controller.js';

/**
 * Health Routes - Only routing, no logic
 */
export default async function healthRoutes(fastify, options) {
  fastify.get('/health', HealthController.getHealth);
}