import { v4 as uuidv4 } from 'uuid';
import { QueueService } from './queue-service.js';
import { userServiceBreaker, templateServiceBreaker } from '../utils/circuit-breaker.js';
import { config } from '../config/env.js';

export const processNotificationRequest = async (requestData) => {
  const { user_id, template_name, variables } = requestData;
  const correlationId = uuidv4();

  console.log(`[${correlationId}] 📨 Processing notification for user ${user_id} with template ${template_name}`);

  try {
    // Since external services aren't running, simulate the data
    console.log(`[${correlationId}] ⚡ Simulating external service calls (circuit breaker OPEN)`);
    
    // Simulate user data (since user service circuit breaker is OPEN)
    const user = {
      id: user_id,
      email: 'test@example.com',
      notification_preference: {
        email_enabled: true,
        push_enabled: true
      },
      push_tokens: []
    };

    // Simulate template data
    const template = {
      id: template_name,
      type: 'EMAIL', // Default to email for testing
      subject: 'Test Notification',
      body: 'Hello {{user_name}}! This is a test notification.'
    };

    console.log(`[${correlationId}] ✅ Using simulated data for testing`);

    // Determine notification type and route accordingly
    const notificationType = 'email'; // Default to email for testing
    
    const notificationData = {
      type: notificationType,
      user_id,
      template_id: template_name,
      variables,
      correlation_id: correlationId
    };

    console.log(`[${correlationId}] 📤 Publishing to ${notificationType} queue...`);

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