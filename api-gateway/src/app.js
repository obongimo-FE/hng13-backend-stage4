import Fastify from 'fastify';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import routes from './routes/index.js';

// Import services
import { queueService } from './services/queue.service.js';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Register routes
fastify.register(routes);

// Health check route
fastify.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Start server
const start = async () => {
  try {
    // Connect to RabbitMQ
    await queueService.connect(process.env.RABBITMQ_URL);
    
    // Start server
    const address = await fastify.listen({
      port: process.env.PORT || 3000,
      host: '0.0.0.0'
    });
    
    console.log(`🚀 API Gateway running at ${address}`);
    console.log(`📍 Health check: ${address}/health`);
    
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await queueService.close();
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await queueService.close();
  await fastify.close();
  process.exit(0);
});

// Start the application
start();