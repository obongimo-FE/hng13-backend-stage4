import { getAllCircuitBreakerStats } from '../utils/circuit-breaker.js';
import { getRedisClient } from '../utils/redis-client.js';
import { formatSuccessResponse } from '../utils/response-formatter.js';

export class HealthController {
  static async getHealth(request, reply) {
    const circuitBreakers = getAllCircuitBreakerStats();
    
    // Check Redis connectivity
    let redisStatus = 'connected';
    try {
      const redisClient = getRedisClient();
      await redisClient.ping();
    } catch (error) {
      redisStatus = 'disconnected';
    }

    // Check RabbitMQ connectivity
    let rabbitmqStatus = 'connected';
    try {
      const { getChannel } = await import('../utils/rabbitmq-client.js');
      const channel = getChannel();
      if (!channel) {
        rabbitmqStatus = 'disconnected';
      }
    } catch (error) {
      rabbitmqStatus = 'disconnected';
    }

    const healthData = {
      status: 'ok',
      service: 'api-gateway',
      circuit_breakers: circuitBreakers,
      dependencies: {
        redis: redisStatus,
        rabbitmq: rabbitmqStatus
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    return formatSuccessResponse(healthData, 'API Gateway service is healthy');
  }
}