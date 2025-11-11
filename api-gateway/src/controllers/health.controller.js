import { get_all_circuit_breaker_stats } from '../utils/circuit-breaker.js';

/**
 * Health Controller - Handles health check logic
 */
export class HealthController {
  static async getHealth(request, reply) {
    const circuit_breakers = get_all_circuit_breaker_stats();
    
    return {
      message: 'API Gateway service is healthy',
      circuit_breakers,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
}