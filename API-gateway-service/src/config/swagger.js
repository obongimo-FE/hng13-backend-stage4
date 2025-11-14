/**
 * Swagger configuration for Fastify v5
 */
export const swaggerOptions = {
  swagger: {
    info: {
      title: 'Distributed Notification System - Complete API Documentation',
      description: `
# Distributed Notification System

A microservices-based notification system that sends emails and push notifications using separate services communicating asynchronously through RabbitMQ.

## System Architecture

### Services Overview

1. **API Gateway (Port 3000)** - Entry point for all requests
   - JWT Authentication
   - Rate Limiting (100 requests/minute)
   - Idempotency Support
   - Circuit Breaker Pattern
   - Routes to email/push queues

2. **User Service (Port 3002)** - User management
   - User registration and authentication
   - Preference management
   - Redis caching
   - PostgreSQL storage

3. **Template Service (Port 3001)** - Template management
   - Template CRUD operations
   - Versioning support
   - Multi-language support
   - Variable substitution

4. **Email Service (Port 3003)** - Email notifications
   - Consumes from email.queue
   - SMTP/SendGrid/Mailgun support
   - Template variable substitution
   - Status tracking

5. **Push Service (Port 3004)** - Push notifications
   - Consumes from push.queue
   - FCM support
   - Device token validation
   - Rich notifications

## Authentication

All API Gateway endpoints (except health check) require JWT Bearer token:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Generate test token: \`node API-gateway-service/src/scripts/generate-test-token.js\`

## Message Queue

- **Exchange**: \`notifications.direct\`
- **Queues**: \`email.queue\`, \`push.queue\`, \`failed.queue\`
- **Management UI**: http://localhost:15672 (admin/password)

## Response Format

All services follow standard response format:
\`\`\`json
{
  "success": boolean,
  "data": T (optional),
  "error": string (optional),
  "message": string,
  "meta": {
    "total": number,
    "limit": number,
    "page": number,
    "total_pages": number,
    "has_next": boolean,
    "has_previous": boolean
  }
}
\`\`\`

## Service Endpoints

### API Gateway (Port 3000)
- `GET /health` - Health check
- `POST /api/v1/notify` - Send notification (requires JWT)
- `GET /api/v1/notifications/:correlation_id/status` - Get notification status

### User Service (Port 3002)
- `GET /health` - Health check
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/login` - User login
- `PATCH /api/v1/users/:id/preferences` - Update preferences

### Template Service (Port 3001)
- `GET /health` - Health check
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/:name` - Get template (supports ?version=1&language=en)

### Email Service (Port 3003)
- `GET /health` - Health check
- Consumes from `email.queue` (RabbitMQ)

### Push Service (Port 3004)
- `GET /health` - Health check
- Consumes from `push.queue` (RabbitMQ)

## Quick Links

- **Swagger UI**: http://localhost:3000/docs
- **RabbitMQ Management**: http://localhost:15672 (admin/password)
- **User Service**: http://localhost:3002/health
- **Template Service**: http://localhost:3001/health
- **Email Service**: http://localhost:3003/health
- **Push Service**: http://localhost:3004/health
      `,
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    security: [
      {
        bearerAuth: []
      }
    ],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Enter: Bearer <jwt-token>'
      }
    }
  }
};

export const swaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'none',
    deepLinking: false
  },
  theme: {
    title: 'Notification System API Gateway'
  }
};