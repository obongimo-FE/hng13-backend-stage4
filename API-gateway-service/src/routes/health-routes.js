import { HealthController } from '../controllers/health-controller.js';

export default async function healthRoutes(fastify, options) {
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          description: 'Successful health check',
          type: 'object',
          properties: {
            message: { type: 'string' },
            circuit_breakers: { type: 'object' },
            dependencies: { type: 'object' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, HealthController.getHealth);
}