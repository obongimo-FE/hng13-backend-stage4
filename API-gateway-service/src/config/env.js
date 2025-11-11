import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    log_level: process.env.LOG_LEVEL || 'info'
  },
  security: {
    jwt_secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
    api_key: process.env.API_KEY || 'default-api-key'
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  services: {
    user: process.env.USER_SERVICE_URL || 'http://user-service:3001',
    template: process.env.TEMPLATE_SERVICE_URL || 'http://template-service:3002'
  },
  rate_limiting: {
    window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max_requests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};