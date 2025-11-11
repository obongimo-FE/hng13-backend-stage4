import { ResponseFormatter } from '../utils/responseFormatter.js';
import { queueService } from '../services/queue.service.js';

export class HealthController {
  static async getHealth(request, reply) {
    const healthData = {
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        rabbitmq: queueService.isConnected ? 'connected' : 'disconnected'
      }
    };

    return ResponseFormatter.success(healthData, 'Service is healthy');
  }
}