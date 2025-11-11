import { NotificationController } from '../controllers/notification.controller.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';

export default async function notificationRoutes(fastify, options) {
  // Apply auth middleware to all routes (like Express router.use())
  fastify.addHook('preHandler', AuthMiddleware.verifyToken);

  // Notification routes (just like Express router.get/post())
  fastify.post('/notifications', NotificationController.createNotification);
  fastify.get('/notifications/:notification_id', NotificationController.getNotificationStatus);
}