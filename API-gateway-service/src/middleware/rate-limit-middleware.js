import { getRedisClient } from '../utils/redis-client.js';
import { config } from '../config/env.js';
import { formatErrorResponse } from '../utils/response-formatter.js';

const getClientIdentifier = (request) => {
  const customId = request.headers['x-client-id'];
  if (customId) return `client:${customId}`;

  const forwardedFor = request.headers['x-forwarded-for'];
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : request.ip;
  return `ip:${ip}`;
};

export const rateLimitMiddleware = async (request, reply) => {
  // Skip rate limiting for health checks
  if (request.url === '/health') return;

  try {
    const redisClient = getRedisClient();
    const clientId = getClientIdentifier(request);
    const key = `rate-limit:${clientId}`;
    const now = Date.now();
    const windowStart = now - config.rate_limiting.window_ms;

    await redisClient.zRemRangeByScore(key, 0, windowStart);
    const currentCount = await redisClient.zCard(key);

    const remaining = Math.max(0, config.rate_limiting.max_requests - currentCount);
    
    reply.header('X-RateLimit-Limit', config.rate_limiting.max_requests);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', Math.ceil((now + config.rate_limiting.window_ms) / 1000));

    if (currentCount >= config.rate_limiting.max_requests) {
      const retryAfter = Math.ceil(config.rate_limiting.window_ms / 1000);
      reply.header('Retry-After', retryAfter);

      return reply.code(429).send(
        formatErrorResponse(
          'rate_limit_exceeded',
          'Too many requests. Please try again later.'
        )
      );
    }

    const requestId = `${now}:${Math.random()}`;
    await redisClient.zAdd(key, [{ score: now, value: requestId }]);
    await redisClient.expire(key, Math.ceil(config.rate_limiting.window_ms / 1000) + 1);

  } catch (error) {
    request.log.error('Rate limit middleware error:', error);
    // Fail open - allow request if Redis fails
  }
};