import { getRedisClient } from '../utils/redis-client.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/response-formatter.js';

export class StatusController {
  static async getNotificationStatus(request, reply) {
    const { correlation_id } = request.params;

    if (!correlation_id) {
      return reply.code(400).send(
        formatErrorResponse(
          'validation_error',
          'correlation_id is required'
        )
      );
    }

    try {
      const client = getRedisClient();
      const key = `notification:${correlation_id}`;
      const statusData = await client.get(key);

      if (!statusData) {
        return reply.code(404).send(
          formatErrorResponse(
            'not_found',
            'Notification status not found'
          )
        );
      }

      const status = JSON.parse(statusData);
      
      return reply.code(200).send(
        formatSuccessResponse(
          status,
          'Notification status retrieved successfully'
        )
      );
    } catch (error) {
      request.log.error('Error fetching notification status:', error);
      return reply.code(500).send(
        formatErrorResponse(
          'internal_error',
          'Failed to retrieve notification status'
        )
      );
    }
  }
}

