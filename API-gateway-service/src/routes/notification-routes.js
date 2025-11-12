import { NotificationController } from '../controllers/notification-controller.js';
import { authenticate } from '../middleware/auth-middleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency-middleware.js';

export default async function notificationRoutes(fastify, options) {
  // Apply authentication to all notification routes
  fastify.addHook('preHandler', authenticate);

  fastify.post('/notify', {
    preHandler: [idempotencyMiddleware],
    schema: {
      description: 'Send email or push notification',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['user_id', 'template_name', 'variables'],
        properties: {
          user_id: { type: 'string' },
          template_name: { type: 'string' },
          variables: { 
            type: 'object',
            additionalProperties: true
          }
        }
      },
      response: {
        202: {
          description: 'Notification accepted for processing',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              nullable: true,
              properties: {
                notification_id: { type: 'string' },
                correlation_id: { type: 'string' },
                status: { type: 'string' },
                queued_at: { type: 'string' }
              }
            },
            message: { type: 'string' },
            meta: { type: 'object' }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        401: {
          description: 'Authentication error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        429: {
          description: 'Rate limit exceeded',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, NotificationController.sendNotification);
}