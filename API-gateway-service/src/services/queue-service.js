import { getChannel, publishToQueue } from '../utils/rabbitmq-client.js';
import { constants } from '../config/constants.js';

export class QueueService {
  static async publishNotification(notificationData) {
    const { type, user_id, template_id, variables, correlation_id } = notificationData;

    const message = {
      notification_id: correlation_id,
      correlation_id,
      user_id,
      user_email: notificationData.user_email,
      push_token: notificationData.push_token,
      template_id,
      template_content: notificationData.template_content,
      template_subject: notificationData.template_subject,
      type,
      variables,
      timestamp: new Date().toISOString(),
      status: 'queued'
    };

    // Determine routing key based on notification type
    const routingKey = type === 'email' ? constants.queues.email : constants.queues.push;
    
    const published = await publishToQueue(routingKey, message);

    if (!published) {
      throw new Error('Failed to publish message to queue');
    }

    return {
      message: 'Notification queued successfully',
      routing_key: routingKey,
      notification_id: correlation_id
    };
  }

  static async publishToFailedQueue(message, error) {
    const failedMessage = {
      ...message,
      error: error.message,
      failed_at: new Date().toISOString()
    };

    await publishToQueue(constants.queues.failed, failedMessage);
  }
}