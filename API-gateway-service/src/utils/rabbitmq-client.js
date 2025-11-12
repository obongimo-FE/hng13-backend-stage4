import amqp from 'amqplib';
import { config } from '../config/env.js';
import { constants } from '../config/constants.js';

let connection = null;
let channel = null;

export const connectRabbitMQ = async () => {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Connecting to RabbitMQ... (attempt ${attempt}/${maxRetries})`);
      
      connection = await amqp.connect(config.rabbitmq.url, {
        credentials: amqp.credentials.plain(
          config.rabbitmq.username,
          config.rabbitmq.password
        )
      });

      channel = await connection.createChannel();

      // Set up exchange and queues
      await setupRabbitMQTopology();

      console.log('RabbitMQ connected successfully');
      return;
      
    } catch (error) {
      console.error(`Failed to connect to RabbitMQ (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

const setupRabbitMQTopology = async () => {
  // Create exchange
  await channel.assertExchange(constants.exchange.name, constants.exchange.type, {
    durable: true
  });

  // Create retry and failed queues for email
  const emailRetryQueue = `${constants.queues.email}.retry`;
  const emailFailedQueue = `${constants.queues.email}.failed`;
  
  // Create retry and failed queues for push
  const pushRetryQueue = `${constants.queues.push}.retry`;
  const pushFailedQueue = `${constants.queues.push}.failed`;

  // Main queues with dead letter exchange
  await channel.assertQueue(constants.queues.email, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': constants.exchange.name,
      'x-dead-letter-routing-key': emailRetryQueue,
      'x-message-ttl': 60000 // 1 minute TTL for retries
    }
  });

  await channel.assertQueue(constants.queues.push, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': constants.exchange.name,
      'x-dead-letter-routing-key': pushRetryQueue,
      'x-message-ttl': 60000 // 1 minute TTL for retries
    }
  });

  // Retry queues with exponential backoff
  await channel.assertQueue(emailRetryQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': constants.exchange.name,
      'x-dead-letter-routing-key': constants.queues.email,
      'x-message-ttl': 120000 // 2 minutes for first retry
    }
  });

  await channel.assertQueue(pushRetryQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': constants.exchange.name,
      'x-dead-letter-routing-key': constants.queues.push,
      'x-message-ttl': 120000 // 2 minutes for first retry
    }
  });

  // Failed queues (dead letter queues)
  await channel.assertQueue(constants.queues.failed, { durable: true });
  await channel.assertQueue(emailFailedQueue, { durable: true });
  await channel.assertQueue(pushFailedQueue, { durable: true });

  // Bind main queues to exchange
  await channel.bindQueue(constants.queues.email, constants.exchange.name, constants.queues.email);
  await channel.bindQueue(constants.queues.push, constants.exchange.name, constants.queues.push);
  
  // Bind retry queues
  await channel.bindQueue(emailRetryQueue, constants.exchange.name, emailRetryQueue);
  await channel.bindQueue(pushRetryQueue, constants.exchange.name, pushRetryQueue);
  
  // Bind failed queues
  await channel.bindQueue(constants.queues.failed, constants.exchange.name, constants.queues.failed);
  await channel.bindQueue(emailFailedQueue, constants.exchange.name, emailFailedQueue);
  await channel.bindQueue(pushFailedQueue, constants.exchange.name, pushFailedQueue);

  console.log('RabbitMQ topology setup completed with retry and DLQ support');
};

export const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not available');
  }
  return channel;
};

export const publishToQueue = async (routingKey, message) => {
  const channel = getChannel();
  
  return channel.publish(
    constants.exchange.name,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
};

export const closeRabbitMQ = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ:', error.message);
  }
};