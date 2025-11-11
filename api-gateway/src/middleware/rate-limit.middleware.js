import { get_redis_client } from '../utils/redis.js';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

const get_client_identifier = (request) => {
  const custom_id = request.headers['x-client-id'];
  if (custom_id) {
    return `client:${custom_id}`;
  }

  const forwarded_for = request.headers['x-forwarded-for'];
  const ip = forwarded_for ? forwarded_for.split(',')[0].trim() : request.ip;
  return `ip:${ip}`;
};

/**
 * Fastify rate limiting plugin
 */
export async function rateLimitPlugin(fastify, options) {
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip rate limiting for health checks
    if (request.url === '/health') {
      return;
    }

    try {
      const redis_client = get_redis_client();
      const client_id = get_client_identifier(request);
      const key = `rate_limit:${client_id}`;
      const now = Date.now();
      const window_start = now - RATE_LIMIT_WINDOW_MS;

      await redis_client.zRemRangeByScore(key, 0, window_start);
      const current_count = await redis_client.zCard(key);

      const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current_count);
      const reset_time = Math.ceil((now + RATE_LIMIT_WINDOW_MS) / 1000);

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
      reply.header('X-RateLimit-Remaining', remaining);
      reply.header('X-RateLimit-Reset', reset_time);

      if (current_count >= RATE_LIMIT_MAX_REQUESTS) {
        const retry_after = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
        reply.header('Retry-After', retry_after);

        request.log.warn(`Client ${client_id} exceeded rate limit: ${current_count}/${RATE_LIMIT_MAX_REQUESTS}`);

        return reply.code(429).send({
          success: false,
          error: 'rate_limit_exceeded',
          message: 'Too many requests. Please try again later.'
        });
      }

      // Add current request
      const request_id = `${now}:${Math.random()}`;
      await redis_client.zAdd(key, { score: now, value: request_id });
      await redis_client.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) + 1);

    } catch (error) {
      request.log.error('Error in rate limit middleware:', error);
      // Fail open - allow request if Redis fails
    }
  });
}

export const rateLimitMiddleware = async (request, reply) => {
  // This is now handled by the plugin hook
};