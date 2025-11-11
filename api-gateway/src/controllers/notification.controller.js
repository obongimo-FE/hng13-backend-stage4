import { ResponseFormatter } from '../utils/responseFormatter.js';
import { NotificationService } from '../services/notification.service.js';

export class NotificationController {
  static async createNotification(request, reply) {
    try {
      const { user_id, template_id, type, variables = {}, priority = 'normal' } = request.body;

      const result = await NotificationService.queueNotification({
        user_id,
        template_id,
        type,
        variables,
        priority
      });

      return ResponseFormatter.success(result, 'Notification queued successfully');

    } catch (error) {
      console.error('Notification creation failed:', error);
      
      return reply.code(500).send(
        ResponseFormatter.error(
          'notification_creation_failed',
          'Failed to create notification'
        )
      );
    }
  }

  static async getNotificationStatus(request, reply) {
    try {
      const { notification_id } = request.params;
      
      const status = await NotificationService.getNotificationStatus(notification_id);
      
      return ResponseFormatter.success(status, 'Notification status retrieved');

    } catch (error) {
      return reply.code(404).send(
        ResponseFormatter.error(
          'notification_not_found',
          'Notification not found'
        )
      );
    }
  }
}