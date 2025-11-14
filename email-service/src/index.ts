import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { RabbitMQConsumer } from './utils/rabbitmq-consumer.js';
import { EmailSender } from './utils/email-sender.js';
import { substituteVariables } from './utils/template-substitution.js';
import { StatusTracker } from './utils/status-tracker.js';
import { formatSuccessResponse } from './utils/response-formatter.js';

dotenv.config();

const server: FastifyInstance = Fastify({ logger: true });

// Initialize services
const emailConfig: {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_secure?: boolean;
  sendgrid_api_key?: string;
  mailgun_api_key?: string;
  mailgun_domain?: string;
} = {};

if (process.env.SMTP_HOST) emailConfig.smtp_host = process.env.SMTP_HOST;
if (process.env.SMTP_PORT) emailConfig.smtp_port = parseInt(process.env.SMTP_PORT);
if (process.env.SMTP_USER) emailConfig.smtp_user = process.env.SMTP_USER;
if (process.env.SMTP_PASSWORD) emailConfig.smtp_password = process.env.SMTP_PASSWORD;
emailConfig.smtp_secure = process.env.SMTP_SECURE === 'true';
if (process.env.SENDGRID_API_KEY) emailConfig.sendgrid_api_key = process.env.SENDGRID_API_KEY;
if (process.env.MAILGUN_API_KEY) emailConfig.mailgun_api_key = process.env.MAILGUN_API_KEY;
if (process.env.MAILGUN_DOMAIN) emailConfig.mailgun_domain = process.env.MAILGUN_DOMAIN;

const emailSender = new EmailSender(emailConfig);

const statusTracker = new StatusTracker(process.env.REDIS_URL || 'redis://localhost:6379');

const rabbitMQConsumer = new RabbitMQConsumer({
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  username: process.env.RABBITMQ_USERNAME || 'admin',
  password: process.env.RABBITMQ_PASSWORD || 'password',
  exchange: 'notifications.direct',
  queue: 'email.queue'
});

// Process email notification
async function processEmailNotification(message: any): Promise<void> {
    const {
      correlation_id,
      notification_id,
      user_id,
      user_email,
      template_content,
      template_subject,
      template_id,
      variables,
      type
    } = message;

  console.log(`[${correlation_id}] 📧 Processing email notification for user ${user_id}`);

  try {
    // Update status to processing
    await statusTracker.updateStatus({
      notification_id,
      correlation_id,
      status: 'processing',
      type: 'email',
      user_id,
      timestamp: new Date().toISOString()
    });

    // Substitute variables in template
    const subject = template_subject 
      ? substituteVariables(template_subject, variables)
      : (variables.subject ? String(variables.subject) : 'Notification');
    const htmlContent = substituteVariables(template_content, variables);
    const textContent = htmlContent.replace(/<[^>]*>/g, ''); // Strip HTML for text version

    // Send email
    const result = await emailSender.sendEmail({
      to: user_email,
      subject: substituteVariables(subject, variables),
      html: htmlContent,
      text: textContent
    });

    if (result.success) {
      // Update status to sent
      const statusUpdate: {
        notification_id: string;
        correlation_id: string;
        status: 'sent';
        type: 'email';
        user_id: string;
        timestamp: string;
        message_id?: string;
      } = {
        notification_id,
        correlation_id,
        status: 'sent',
        type: 'email',
        user_id,
        timestamp: new Date().toISOString()
      };
      
      if (result.messageId) {
        statusUpdate.message_id = result.messageId;
      }
      
      await statusTracker.updateStatus(statusUpdate);

      console.log(`[${correlation_id}] ✅ Email sent successfully`);
    } else {
      throw new Error(result.error || 'Failed to send email');
    }
  } catch (error: any) {
    console.error(`[${correlation_id}] ❌ Error sending email:`, error.message);

    // Update status to failed
    await statusTracker.updateStatus({
      notification_id,
      correlation_id,
      status: 'failed',
      type: 'email',
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
    await rabbitMQConsumer.consume(processEmailNotification);

    // Health check endpoint
    server.get('/health', async () => {
      const emailConnectionOk = await emailSender.verifyConnection();
      
      return formatSuccessResponse(
        {
          status: 'ok',
          service: 'email-service',
          email_connection: emailConnectionOk ? 'connected' : 'not_configured'
        },
        'Service is healthy'
      );
    });

    await server.listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3003 });
    console.log(`📧 Email Service running on port ${Number(process.env.PORT) || 3003}`);

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

