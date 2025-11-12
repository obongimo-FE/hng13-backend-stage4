import Fastify from 'fastify';
import { config } from './config/env.js';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import routes from './routes/index.js';
import { connectRabbitMQ, closeRabbitMQ } from './utils/rabbitmq-client.js';
import { connectRedis, closeRedis } from './utils/redis-client.js';
import { rateLimitMiddleware } from './middleware/rate-limit-middleware.js';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: config.server.log_level,
    transport: config.server.env === 'development' ? {
      target: 'pino-pretty',
      options: { colorize: true }
    } : undefined
  }
});

// Setup Swagger for Fastify v5
const setupSwagger = async () => {
  // Register Swagger
  await fastify.register(fastifySwagger, swaggerOptions);

  // Register Swagger UI
  await fastify.register(fastifySwaggerUi, swaggerUiOptions);
};

// Global rate limiting
fastify.addHook('onRequest', rateLimitMiddleware);

// Setup server
async function setupServer() {
  try {
    // Connect to external services
    await connectRabbitMQ();
    await connectRedis();
    
    fastify.log.info('External services connected successfully');

    // Setup Swagger documentation
    await setupSwagger();
    fastify.log.info('Swagger documentation setup complete');

    // Register all routes
    await fastify.register(routes);

    fastify.log.info('All routes registered successfully');

    return fastify;

  } catch (error) {
    fastify.log.error('Server setup failed:', error);
    throw error;
  }
}

// Start server
const start = async () => {
  try {
    const server = await setupServer();
    
    await server.listen({
      port: config.server.port,
      host: config.server.host
    });

    server.log.info(`API Gateway Service running on ${config.server.host}:${config.server.port}`);
    server.log.info(`Health check: http://${config.server.host}:${config.server.port}/health`);
    server.log.info(`Documentation: http://${config.server.host}:${config.server.port}/docs`);
    server.log.info(`Environment: ${config.server.env}`);

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    await closeRabbitMQ();
    await closeRedis();
    await fastify.close();
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Start the application
start();