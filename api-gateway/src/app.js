import Fastify from 'fastify';
import dotenv from 'dotenv';
import { config } from './config/env.js';
import notificationRoutes from './routes/notification.routes.js';
import { connect_rabbitmq, close_rabbitmq } from './utils/rabbitmq.js';
import { connect_redis, close_redis } from './utils/redis.js';
import { get_all_circuit_breaker_stats } from './utils/circuit-breaker.js';
import { rateLimitPlugin } from './middleware/rate-limit.middleware.js';

// Load environment variables
dotenv.config();

// Create Fastify instance with proper logging
const fastify = Fastify({
  logger: {
    level: config.server.log_level || 'info',
    transport: config.server.env === 'development' ? {
      target: 'pino-pretty',
      options: { colorize: true }
    } : undefined
  }
});

// Register plugins and routes
async function setupServer() {
  // Connect to external services
  try {
    await connect_rabbitmq();
    await connect_redis();
    fastify.log.info('✅ External services connected');
  } catch (error) {
    fastify.log.error('❌ Failed to connect to external services:', error);
    process.exit(1);
  }

  // Register rate limiting plugin
  await fastify.register(rateLimitPlugin);

  // Register notification routes
  await fastify.register(notificationRoutes, { prefix: '/api/v1' });

  // Health check endpoint
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            circuit_breakers: { type: 'object' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const circuit_breakers = get_all_circuit_breaker_stats();
    
    return {
      message: 'API Gateway service is healthy',
      circuit_breakers,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });

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