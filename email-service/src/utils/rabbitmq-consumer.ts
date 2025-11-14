import amqp from 'amqplib';

interface QueueConfig {
  url: string;
  username: string;
  password: string;
  exchange: string;
  queue: string;
}

export class RabbitMQConsumer {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private config: QueueConfig;

  constructor(config: QueueConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 3000; // 3 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Connecting to RabbitMQ... (attempt ${attempt}/${maxRetries})`);
        
        this.connection = await amqp.connect(this.config.url, {
          credentials: amqp.credentials.plain(
            this.config.username,
            this.config.password
          )
        });

        if (!this.connection) {
          throw new Error('Failed to establish RabbitMQ connection');
        }

        this.channel = await this.connection.createChannel();
        
        if (!this.channel) {
          throw new Error('Failed to create RabbitMQ channel');
        }
        
        // If we get here, connection was successful
        // Assert exchange exists
        await this.channel.assertExchange(this.config.exchange, 'direct', {
          durable: true
        });

        // Assert queue exists with same arguments as API Gateway
        // (API Gateway creates queues with x-message-ttl and dead letter settings)
        const emailRetryQueue = `${this.config.queue}.retry`;
        await this.channel.assertQueue(this.config.queue, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': this.config.exchange,
            'x-dead-letter-routing-key': emailRetryQueue,
            'x-message-ttl': 60000 // Must match API Gateway settings
          }
        });

        // Bind queue to exchange
        await this.channel.bindQueue(
          this.config.queue,
          this.config.exchange,
          this.config.queue
        );

        console.log('✅ Connected to RabbitMQ');
        return; // Successfully connected, exit the function
      } catch (error: any) {
        if (attempt === maxRetries) {
          console.error(`Failed to connect to RabbitMQ after ${maxRetries} attempts:`, error.message);
          throw error;
        }
        
        console.log(`RabbitMQ connection failed (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async consume(
    onMessage: (message: any) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    console.log(`📬 Consuming messages from ${this.config.queue}...`);

    await this.channel.consume(
      this.config.queue,
      async (msg: amqp.ConsumeMessage | null): Promise<void> => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`📨 Received message: ${content.correlation_id}`);

          await onMessage(content);

          // Acknowledge message
          this.channel!.ack(msg);
          console.log(`✅ Processed message: ${content.correlation_id}`);
        } catch (error: any) {
          console.error('❌ Error processing message:', error.message);
          
          // Reject and requeue (will go to retry queue via DLX)
          this.channel!.nack(msg, false, true);
        }
      },
      {
        noAck: false // Manual acknowledgment
      }
    );
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await (this.connection as any).close();
      }
      console.log('RabbitMQ connection closed');
    } catch (error: any) {
      console.error('Error closing RabbitMQ:', error.message);
    }
  }
}

