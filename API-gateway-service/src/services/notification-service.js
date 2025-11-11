import { v4 as uuidv4 } from 'uuid';
import { QueueService } from './queue-service.js';
import { userServiceBreaker, templateServiceBreaker } from '../utils/circuit-breaker.js';
import { config } from '../config/env.js';

export const processNotificationRequest = async (requestData) => {
  const { user_id, template_name, variables } = requestData;
  const correlationId = uuidv4();

  console.log(`[${correlationId}] Processing notification for user ${user_id} with template ${template_name}`);

  try {
    // 1. Fetch user data from User Service
    console.log(`[${correlationId}] Fetching user data...`);
    const userResponse = await userServiceBreaker.fire(`${config.services.user}/api/v1/users/${user_id}`);
    const user = userResponse.data;
    
    if (!user) {
      throw new Error('User not found');
    }

    // 2. Fetch template data from Template Service
    console.log(`[${correlationId}] Fetching template data...`);
    const templateResponse = await templateServiceBreaker.fire(`${config.services.template}/api/v1/templates/name/${template_name}`);
    const template = templateResponse.data;
    
    if (!template) {
      throw new Error('Template not found');
    }

    // 3. Determine notification type and route accordingly
    const notificationType = template.type.toLowerCase(); // 'email' or 'push'
    
    const notificationData = {
      type: notificationType,
      user_id,
      template_id: template_name,
      variables,
      correlation_id: correlationId
    };

    // 4. Publish to appropriate queue
    const result = await QueueService.publishNotification(notificationData);
    
    console.log(`[${correlationId}] ✅ Notification queued successfully: ${result.routing_key}`);
    
    return result;

  } catch (error) {
    console.error(`[${correlationId}] ❌ Error processing notification:`, error.message);
    
    // Publish to failed queue for dead letter handling
    await QueueService.publishToFailedQueue(
      {
        user_id,
        template_name,
        variables,
        correlation_id: correlationId,
        timestamp: new Date().toISOString()
      },
      error
    );

    throw error;
  }
};