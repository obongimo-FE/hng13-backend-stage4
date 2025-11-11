import amqp from 'amqplib';

export class QueueService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect(rabbitmqUrl) {
    try {
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      // Set up exchange and queues exactly as required
      await this.channel.assertExchange('notifications.direct', 'direct', { durable: true });
      
      await this.channel.assertQueue('email.queue', { durable: true });
      await this.channel.assertQueue('push.queue', { durable: true });
      await this.channel.assertQueue('failed.queue', { durable: true });

      // Bind queues to exchange
      await this.channel.bindQueue('email.queue', 'notifications.direct', 'email');
      await this.channel.bindQueue('push.queue', 'notifications.direct', 'push');
      await this.channel.bindQueue('failed.queue', 'notifications.direct', 'failed');

      this.isConnected = true;
      console.log('✅ Connected to RabbitMQ successfully');
      
    } catch (error) {
      console.error('❌ RabbitMQ connection failed:', error.message);
      throw error;
    }
  }

  async publishToQueue(routingKey, message) {
    if (!this.isConnected) {
      throw new Error('Queue service not connected to RabbitMQ');
    }

    return this.channel.publish(
      'notifications.direct',
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log('✅ RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error.message);
    }
  }
}

// Singleton instance
export const queueService = new QueueService();