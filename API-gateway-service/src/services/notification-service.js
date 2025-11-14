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

    // Determine notification types based on template and user preferences
    const templateType = template.type ? template.type.toLowerCase() : 'email';
    const shouldSendEmail = emailEnabled && (templateType === 'email' || templateType === 'both');
    const shouldSendPush = pushEnabled && user.push_token && (templateType === 'push' || templateType === 'both');

    if (!shouldSendEmail && !shouldSendPush) {
      throw new Error('User has disabled all notification preferences or missing push token');
    }

    // Prepare base notification data
    const baseNotificationData = {
      user_id: user.user_id || user_id,
      user_email: user.email,
      push_token: user.push_token,
      template_id: template.template_id || template_name,
      template_content: template.content,
      template_subject: template.subject,
      variables: {
        ...variables,
        user_name: user.name || variables.user_name,
        user_email: user.email || variables.user_email
      },
      correlation_id: correlationId
    };

    const results = [];

    // Send email if enabled
    if (shouldSendEmail) {
      const emailData = {
        ...baseNotificationData,
        type: 'email'
      };
      
      console.log(`[${correlationId}] 📤 Publishing to email queue...`);
      const emailResult = await QueueService.publishNotification(emailData);
      results.push(emailResult);
      console.log(`[${correlationId}] ✅ Email notification queued: ${emailResult.routing_key}`);
    }

    // Send push if enabled
    if (shouldSendPush) {
      const pushData = {
        ...baseNotificationData,
        type: 'push'
      };
      
      console.log(`[${correlationId}] 📤 Publishing to push queue...`);
      const pushResult = await QueueService.publishNotification(pushData);
      results.push(pushResult);
      console.log(`[${correlationId}] ✅ Push notification queued: ${pushResult.routing_key}`);
    }
    
    return {
      correlation_id: correlationId,
      notifications: results
    };

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