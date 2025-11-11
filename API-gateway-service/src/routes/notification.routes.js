import { NotificationController } from '../controllers/notification.controller.js';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.js';

/**
 * Notification Routes - Only routing, no logic
 */
export default async function notificationRoutes(fastify, options) {
  fastify.post('/notify', {
    preHandler: [idempotencyMiddleware]
  }, NotificationController.sendNotification);
}