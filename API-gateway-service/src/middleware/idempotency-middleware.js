import { checkIdempotencyKey, setIdempotencyKey, getIdempotencyValue } from '../utils/redis-client.js';
import { formatSuccessResponse } from '../utils/response-formatter.js';

export const idempotencyMiddleware = async (request, reply) => {
  const idempotencyKey = request.headers['idempotency-key'];

  if (!idempotencyKey) return;

  try {
    const exists = await checkIdempotencyKey(`idempotency:${idempotencyKey}`);

    if (exists) {
      const cachedResponse = await getIdempotencyValue(`idempotency:${idempotencyKey}`);
      
      if (cachedResponse && cachedResponse.status === 'completed') {
        return reply.send(
          formatSuccessResponse(
            cachedResponse.data,
            'Request already processed (idempotent)'
          )
        );
      }
    }

    await setIdempotencyKey(`idempotency:${idempotencyKey}`, {
      status: 'processing',
      timestamp: new Date().toISOString()
    });

    request.idempotencyKey = idempotencyKey;

    const originalJson = reply.send.bind(reply);
    reply.send = function (payload) {
      if (request.idempotencyKey) {
        setIdempotencyKey(`idempotency:${request.idempotencyKey}`, {
          status: 'completed',
          timestamp: new Date().toISOString(),
          data: payload.data
        }).catch(err => {
          request.log.error('Error caching idempotency response:', err);
        });
      }
      return originalJson(payload);
    };

  } catch (error) {
    request.log.error('Idempotency middleware error:', error);
    // Fail open - proceed with request
  }
};