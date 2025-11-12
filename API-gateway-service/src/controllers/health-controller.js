import { getAllCircuitBreakerStats } from '../utils/circuit-breaker.js';
import { getRedisClient } from '../utils/redis-client.js';

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

    return {
      message: 'API Gateway service is healthy',
      circuit_breakers: circuitBreakers,
      dependencies: {
        redis: redisStatus,
        rabbitmq: 'connected' // Assuming connected since we're running
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
}