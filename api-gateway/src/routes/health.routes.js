import { HealthController } from '../controllers/health.controller.js';

export default async function healthRoutes(fastify, options) {
  fastify.get('/health', HealthController.getHealth);
}