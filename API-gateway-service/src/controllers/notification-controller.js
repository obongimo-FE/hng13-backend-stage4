import { processNotificationRequest } from '../services/notification-service.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/response-formatter.js';

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
    processNotificationRequest(request.body).catch((error) => {
      request.log.error('Error processing notification request (async):', error);
    });
  }
}