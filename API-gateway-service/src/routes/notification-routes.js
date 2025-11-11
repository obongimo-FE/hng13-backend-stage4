import { NotificationController } from '../controllers/notification-controller.js';
import { authenticate } from '../middleware/auth-middleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency-middleware.js';
import { validateNotificationRequest } from '../middleware/validation-middleware.js';

export default async function notificationRoutes(fastify, options) {
  // Apply authentication to all notification routes
  fastify.addHook('preHandler', authenticate);

  fastify.post('/notify', {
    preHandler: [idempotencyMiddleware, validateNotificationRequest]
  }, NotificationController.sendNotification);
}