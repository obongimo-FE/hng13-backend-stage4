import Fastify from 'fastify';
import dotenv from 'dotenv';
import { config } from './config/env.js';
import routes from './routes/index.js'; // Clean routes import
import { connect_rabbitmq, close_rabbitmq } from './utils/rabbitmq.js';
import { connect_redis, close_redis } from './utils/redis.js';
import { rateLimitPlugin } from './middleware/rate-limit.middleware.js';

// Load environment variables
dotenv.config();

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: config.server.log_level || 'info',
    transport: config.server.env === 'development' ? {
      target: 'pino-pretty',
      options: { colorize: true }
    } : undefined
  }
});

// Setup server with clean architecture
async function setupServer() {
  try {
    // Connect to external services
    await connect_rabbitmq();
    await connect_redis();
    fastify.log.info('✅ External services connected');
  } catch (error) {
    fastify.log.error('❌ Failed to connect to external services:', error);
    process.exit(1);
  }

  // Register plugins
  await fastify.register(rateLimitPlugin);

  // Register all routes (clean import)
  await fastify.register(routes);

  return fastify;
}

// Start server
const start = async () => {
  try {
    const server = await setupServer();
    
    await server.listen({
      port: config.server.port,
      host: config.server.host
    });

    server.log.info(`🚀 API Gateway running on ${config.server.host}:${config.server.port}`);
    
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  await close_rabbitmq();
  await close_redis();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the application
start();