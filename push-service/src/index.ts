import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { RabbitMQConsumer } from './utils/rabbitmq-consumer.js';
import { PushSender } from './utils/push-sender.js';
import { substituteVariables } from './utils/template-substitution.js';
import { StatusTracker } from './utils/status-tracker.js';
import { formatSuccessResponse } from './utils/response-formatter.js';

dotenv.config();

const server: FastifyInstance = Fastify({ logger: true });

// Initialize services
const pushConfig: {
  fcm_service_account?: string;
  fcm_service_account_json?: string;
} = {};

if (process.env.FCM_SERVICE_ACCOUNT) pushConfig.fcm_service_account = process.env.FCM_SERVICE_ACCOUNT;
if (process.env.FCM_SERVICE_ACCOUNT_JSON) pushConfig.fcm_service_account_json = process.env.FCM_SERVICE_ACCOUNT_JSON;

const pushSender = new PushSender(pushConfig);

const statusTracker = new StatusTracker(process.env.REDIS_URL || 'redis://localhost:6379');

const rabbitMQConsumer = new RabbitMQConsumer({
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  username: process.env.RABBITMQ_USERNAME || 'admin',
  password: process.env.RABBITMQ_PASSWORD || 'password',
  exchange: 'notifications.direct',
  queue: 'push.queue'
});

// Process push notification
async function processPushNotification(message: any): Promise<void> {
  const {
    correlation_id,
    notification_id,
    user_id,
    push_token,
    template_content,
    template_id,
    variables,
    type
  } = message;

  console.log(`[${correlation_id}] 📱 Processing push notification for user ${user_id}`);

  try {
    if (!push_token) {
      throw new Error('Push token not provided');
    }

    // Update status to processing
    await statusTracker.updateStatus({
      notification_id,
      correlation_id,
      status: 'processing',
      type: 'push',
      user_id,
      timestamp: new Date().toISOString()
    });

    // Extract title and body from template
    // Template format: "Title: {{title}}\nBody: {{body}}" or just content
    let title = 'Notification';
    let body = substituteVariables(template_content, variables);

    // Try to extract title if format is "Title: ...\nBody: ..."
    if (template_content.includes('Title:') || template_content.includes('title:')) {
      const titleMatch = template_content.match(/(?:Title|title):\s*(.+?)(?:\n|$)/i);
      const bodyMatch = template_content.match(/(?:Body|body):\s*(.+?)$/is);
      
      if (titleMatch) {
        title = substituteVariables(titleMatch[1].trim(), variables);
      }
      if (bodyMatch) {
        body = substituteVariables(bodyMatch[1].trim(), variables);
      }
    } else {
      // Use first line as title, rest as body
      const lines = body.split('\n');
      if (lines.length > 1) {
        title = lines[0] || 'Notification';
        body = lines.slice(1).join('\n') || body;
      } else {
        title = 'Notification';
        body = lines[0] || body;
      }
    }

    // Use variables for title/body if provided
    if (variables.title) {
      title = String(variables.title);
    }
    if (variables.body) {
      body = String(variables.body);
    }

    // Send push notification
    const result = await pushSender.sendPush({
      token: push_token,
      title: title,
      body: body,
      data: {
        template_id: String(template_id),
        user_id: String(user_id),
        correlation_id: correlation_id,
        ...Object.fromEntries(
          Object.entries(variables).map(([k, v]) => [k, String(v)])
        )
      },
      imageUrl: variables.image_url || variables.imageUrl,
      link: variables.link || variables.url
    });

    if (result.success) {
      // Update status to sent
      const statusUpdate: {
        notification_id: string;
        correlation_id: string;
        status: 'sent';
        type: 'push';
        user_id: string;
        timestamp: string;
        message_id?: string;
      } = {
        notification_id,
        correlation_id,
        status: 'sent',
        type: 'push',
        user_id,
        timestamp: new Date().toISOString()
      };
      
      if (result.messageId) {
        statusUpdate.message_id = result.messageId;
      }
      
      await statusTracker.updateStatus(statusUpdate);

      console.log(`[${correlation_id}] ✅ Push notification sent successfully`);
    } else {
      throw new Error(result.error || 'Failed to send push notification');
    }
  } catch (error: any) {
    console.error(`[${correlation_id}] ❌ Error sending push notification:`, error.message);

    // Update status to failed
    await statusTracker.updateStatus({
      notification_id,
      correlation_id,
      status: 'failed',
      type: 'push',
      user_id,
      timestamp: new Date().toISOString(),
      error: error.message
    });

    // Re-throw to trigger retry mechanism
    throw error;
  }
}

const start = async () => {
  try {
    // Connect to Redis for status tracking
    await statusTracker.connect();

    // Connect to RabbitMQ (with retry logic)
    await rabbitMQConsumer.connect();

    // Start consuming messages
    await rabbitMQConsumer.consume(processPushNotification);

    // Health check endpoint
    server.get('/health', async () => {
      return formatSuccessResponse(
        {
          status: 'ok',
          service: 'push-service',
          fcm_initialized: pushSender.isInitialized()
        },
        'Service is healthy'
      );
    });

    await server.listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3004 });
    console.log(`📱 Push Service running on port ${Number(process.env.PORT) || 3004}`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    await rabbitMQConsumer.close();
    await statusTracker.close();
    await server.close();
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();

