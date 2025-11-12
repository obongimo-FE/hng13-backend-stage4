import { v4 as uuidv4 } from 'uuid';
import { QueueService } from './queue-service.js';
import { fetchUser, fetchTemplate } from '../utils/service-client.js';

export const processNotificationRequest = async (requestData) => {
  const { user_id, template_name, variables } = requestData;
  const correlationId = uuidv4();

  console.log(`[${correlationId}] 📨 Processing notification for user ${user_id} with template ${template_name}`);

  try {
    // Fetch user data from User Service
    console.log(`[${correlationId}] 🔍 Fetching user data from User Service...`);
    const user = await fetchUser(user_id);
    
    if (!user) {
      throw new Error(`User ${user_id} not found`);
    }

    // Check user preferences
    const preferences = user.preferences || { email: true, push: true };
    const emailEnabled = preferences.email !== false;
    const pushEnabled = preferences.push !== false;

    if (!emailEnabled && !pushEnabled) {
      throw new Error(`User ${user_id} has disabled all notification preferences`);
    }

    // Fetch template from Template Service
    console.log(`[${correlationId}] 🔍 Fetching template from Template Service...`);
    const template = await fetchTemplate(template_name);
    
    if (!template) {
      throw new Error(`Template ${template_name} not found`);
    }

    console.log(`[${correlationId}] ✅ Retrieved user and template data`);

    // Determine notification type based on template content or default to email
    // For now, we'll check if template has a type field, otherwise default to email
    // The email/push services will handle the actual routing
    let notificationType = 'email'; // Default
    
    // If template has a type field, use it
    if (template.type) {
      notificationType = template.type.toLowerCase();
    } else if (template.content && template.content.includes('{{push_token}}')) {
      notificationType = 'push';
    }

    // If user has disabled the notification type, skip it
    if (notificationType === 'email' && !emailEnabled) {
      if (pushEnabled) {
        notificationType = 'push';
      } else {
        throw new Error('User has disabled both email and push notifications');
      }
    } else if (notificationType === 'push' && !pushEnabled) {
      if (emailEnabled) {
        notificationType = 'email';
      } else {
        throw new Error('User has disabled both email and push notifications');
      }
    }
    
    // Prepare notification data with user and template info
    const notificationData = {
      type: notificationType,
      user_id: user.user_id || user_id,
      user_email: user.email,
      push_token: user.push_token,
      template_id: template.template_id || template_name,
      template_content: template.content,
      variables: {
        ...variables,
        user_name: user.name || variables.user_name,
        user_email: user.email || variables.user_email
      },
      correlation_id: correlationId
    };

    console.log(`[${correlationId}] 📤 Publishing to ${notificationType} queue...`);

    // Publish to appropriate queue
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