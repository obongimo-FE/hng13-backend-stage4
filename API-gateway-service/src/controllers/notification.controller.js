import { process_notification_request } from '../services/notification.service.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/response-formatter.js';

/**
 * Notification Controller - Handles notification logic
 */
export class NotificationController {
  static async sendNotification(request, reply) {
    const { user_id, template_name, variables } = request.body;

    // Validation
    if (!user_id || !template_name || !variables) {
      return reply.code(400).send(
        formatErrorResponse(
          { code: 'validation_error' },
          'user_id, template_name, and variables are required'
        )
      );
    }

    // Return 202 Accepted immediately (fire and forget)
    const response = formatSuccessResponse(
      null,
      'Notification request accepted and is being processed.'
    );

    reply.code(202).send(response);

    // Process asynchronously (don't await)
    process_notification_request(request.body).catch((error) => {
      request.log.error('Error processing notification request (async):', error);
    });
  }
}