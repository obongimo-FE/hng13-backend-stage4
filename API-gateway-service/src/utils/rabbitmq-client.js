import amqp from 'amqplib';
import { config } from '../config/env.js';
import { constants } from '../config/constants.js';

let connection = null;
let channel = null;

export const connectRabbitMQ = async () => {
  try {
    console.log('Connecting to RabbitMQ...');
    
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
    
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
    throw error;
  }
};

const setupRabbitMQTopology = async () => {
  // Create exchange
  await channel.assertExchange(constants.exchange.name, constants.exchange.type, {
    durable: true
  });

  // Create queues
  await channel.assertQueue(constants.queues.email, { durable: true });
  await channel.assertQueue(constants.queues.push, { durable: true });
  await channel.assertQueue(constants.queues.failed, { durable: true });

  // Bind queues to exchange
  await channel.bindQueue(constants.queues.email, constants.exchange.name, constants.queues.email);
  await channel.bindQueue(constants.queues.push, constants.exchange.name, constants.queues.push);
  await channel.bindQueue(constants.queues.failed, constants.exchange.name, constants.queues.failed);

  console.log('RabbitMQ topology setup completed');
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