# HNG13 Backend Stage 4 - Distributed Notification System

A microservices-based notification system that sends emails and push notifications using separate services communicating asynchronously through RabbitMQ.

## Architecture

```
┌─────────────┐
│ API Gateway │ (Port 3000)
└──────┬──────┘
       │
       ├─── User Service (Port 3002) ──── PostgreSQL (user_db)
       │
       ├─── Template Service (Port 3001) ──── PostgreSQL (template_db)
       │
       └─── RabbitMQ ──── Email Queue ──── Email Service (Future)
                      └─── Push Queue ──── Push Service (Future)
```

## Services

1. **API Gateway Service** - Entry point, validation, authentication, routing
2. **User Service** - User management, preferences, authentication
3. **Template Service** - Template storage, versioning, multi-language support
4. **Email Service** - (To be implemented) Email sending via SMTP/APIs
5. **Push Service** - (To be implemented) Push notifications via FCM/OneSignal

## Quick Start

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions.

```bash
# Start all services
docker-compose up --build

# Check health
curl http://localhost:3000/health
```

## Features

✅ **API Gateway**
- Request validation and authentication (JWT)
- Rate limiting (100 req/min)
- Idempotency support
- Circuit breaker pattern
- Swagger documentation

✅ **User Service**
- User registration and login
- Preference management
- Redis caching
- PostgreSQL storage

✅ **Template Service**
- Template CRUD operations
- Versioning support
- Multi-language support
- Variable substitution ready

✅ **Message Queue**
- RabbitMQ with retry queues
- Dead letter queues
- Exponential backoff support

✅ **Infrastructure**
- Docker Compose setup
- Separate databases per service
- Health check endpoints
- CI/CD workflow

## API Documentation

- **Swagger UI**: http://localhost:3000/docs
- **RabbitMQ Management**: http://localhost:15672 (admin/password)

## Response Format

All services follow the standard response format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "meta": {
    "total": 1,
    "limit": 1,
    "page": 1,
    "total_pages": 1,
    "has_next": false,
    "has_previous": false
  }
}
```

## Environment Variables

Key environment variables (see `docker-compose.yml` for defaults):

- `JWT_SECRET` - JWT signing secret
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `RABBITMQ_URL` - RabbitMQ connection string

## Development

```bash
# User Service
cd user-service && npm install && npm run dev

# Template Service
cd template-service && npm install && npm run dev

# API Gateway
cd API-gateway-service && npm install && npm run dev
```

## Testing

```bash
# Run API Gateway tests
cd API-gateway-service && npm test
```

## Deployment

The project includes a GitHub Actions CI/CD workflow that:
1. Runs tests
2. Builds Docker images
3. Deploys to server (when configured)

See `.github/workflows/ci-cd.yml` for details.

## Requirements Met

- ✅ API Gateway with validation and authentication
- ✅ User Service with preferences
- ✅ Template Service with versioning
- ✅ RabbitMQ message queue setup
- ✅ Circuit breaker pattern
- ✅ Retry system with exponential backoff
- ✅ Health check endpoints
- ✅ Idempotency support
- ✅ Response format standardization (snake_case)
- ✅ Separate databases per service
- ✅ Docker containerization
- ✅ Swagger/OpenAPI documentation
- ✅ CI/CD workflow

## Next Steps

When email and push services are ready:
1. Add them to `docker-compose.yml`
2. They will consume from `email.queue` and `push.queue`
3. Failed messages automatically go to retry queues

## Team

This project was built collaboratively by a team of 4 developers.


