export const constants = {
  queues: {
    email: 'email.queue',
    push: 'push.queue',
    failed: 'failed.queue'
  },
  exchange: {
    name: 'notifications.direct',
    type: 'direct'
  },
  redis: {
    ttl: {
      idempotency: 86400, // 24 hours
      rate_limit: 60 // 1 minute
    }
  },
  circuit_breaker: {
    timeout: 5000,
    error_threshold: 50,
    reset_timeout: 30000
  }
};