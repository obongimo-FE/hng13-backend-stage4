# HNG13 Backend Stage 4 - Setup Guide

This guide will walk you through setting up and running the Distributed Notification System locally.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

## Quick Start

### 1. Clone and Navigate

```bash
cd hng13-backend-stage4
```

### 2. Environment Variables

Create a `.env` file in the root directory (optional, defaults are provided):

```env
# JWT Secret for API Gateway
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database (already configured in docker-compose.yml)
POSTGRES_USER=hng_user
POSTGRES_PASSWORD=hng_pass

# RabbitMQ (already configured in docker-compose.yml)
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=password
```

### 3. Start All Services

```bash
docker-compose up --build
```

This will start:
- **PostgreSQL** (port 5433) - Separate databases for user-service and template-service
- **Redis** (port 6379) - Caching and rate limiting
- **RabbitMQ** (ports 5672, 15672) - Message queue
- **User Service** (port 3002) - User management
- **Template Service** (port 3001) - Template management
- **API Gateway** (port 3000) - Entry point

### 4. Verify Services

Check health endpoints:

```bash
# API Gateway
curl http://localhost:3000/health

# User Service
curl http://localhost:3002/health

# Template Service
curl http://localhost:3001/health
```

### 5. Access Management UIs

- **RabbitMQ Management**: http://localhost:15672
  - Username: `admin`
  - Password: `password`

- **API Gateway Swagger Docs**: http://localhost:3000/docs

## Service Details

### API Gateway (Port 3000)

**Features:**
- Request validation and authentication
- Rate limiting (100 requests/minute)
- Idempotency support (via `Idempotency-Key` header)
- Circuit breaker for downstream services
- Routes notifications to email/push queues

**Endpoints:**
- `GET /health` - Health check
- `POST /api/v1/notify` - Send notification (requires JWT token)

**Generate Test Token:**
```bash
cd API-gateway-service
npm install
node src/scripts/generate-test-token.js
```

### User Service (Port 3002)

**Features:**
- User registration and authentication
- User preferences management
- Redis caching for user data
- PostgreSQL database

**Endpoints:**
- `GET /health` - Health check
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user
- `POST /api/v1/login` - Login
- `PATCH /api/v1/users/:id/preferences` - Update preferences

**Example:**
```bash
# Create user
curl -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "push_token": "fcm-token-here"
  }'

# Get user
curl http://localhost:3002/api/v1/users/1
```

### Template Service (Port 3001)

**Features:**
- Template creation and retrieval
- Versioning support
- Multi-language support
- Variable substitution support

**Endpoints:**
- `GET /health` - Health check
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/:name` - Get template (supports `?version=1&language=en`)

**Example:**
```bash
# Create template
curl -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "type": "email",
    "subject": "Welcome {{user_name}}!",
    "content": "Hello {{user_name}}, welcome to our platform!",
    "language": "en",
    "version": 1,
    "variables": ["user_name", "user_email"]
  }'

# Get template
curl "http://localhost:3001/api/v1/templates/welcome_email?language=en"
```

## Testing the Full Flow

### 1. Create a User

```bash
curl -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "push_token": "test-push-token"
  }'
```

Note the `user_id` from the response.

### 2. Create a Template

```bash
curl -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_notification",
    "type": "email",
    "subject": "Test Notification",
    "content": "Hello {{user_name}}, this is a test!",
    "language": "en"
  }'
```

### 3. Generate JWT Token

```bash
cd API-gateway-service
npm install
node src/scripts/generate-test-token.js
```

### 4. Send Notification

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Idempotency-Key: unique-request-id-123" \
  -d '{
    "user_id": "1",
    "template_name": "test_notification",
    "variables": {
      "user_name": "Test User"
    }
  }'
```

The notification will be queued to RabbitMQ. The email/push services (when implemented) will consume and process them.

## Database Structure

### User Service Database (`user_db`)
- `users` table: User data, preferences, push tokens

### Template Service Database (`template_db`)
- `templates` table: Template content, versions, languages

## RabbitMQ Queues

The system creates the following queues:
- `email.queue` - Email notifications
- `push.queue` - Push notifications
- `email.queue.retry` - Retry queue for failed emails
- `push.queue.retry` - Retry queue for failed push
- `failed.queue` - Dead letter queue

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

Error responses:
```json
{
  "success": false,
  "error": "error_code",
  "message": "Error message",
  "meta": { ... }
}
```

## Development

### Running Services Individually

```bash
# User Service
cd user-service
npm install
npm run dev

# Template Service
cd template-service
npm install
npm run dev

# API Gateway
cd API-gateway-service
npm install
npm run dev
```

### Building Services

```bash
# User Service
cd user-service
npm run build

# Template Service
cd template-service
npm run build
```

## Troubleshooting

### Services won't start
- Check if ports 3000, 3001, 3002, 5433, 6379, 5672, 15672 are available
- Ensure Docker is running
- Check logs: `docker-compose logs [service-name]`

### Database connection errors
- Wait for PostgreSQL to be healthy: `docker-compose ps`
- Check database initialization: `docker-compose logs postgres_db`

### RabbitMQ connection errors
- Verify RabbitMQ is running: `docker-compose ps rabbitmq`
- Check management UI: http://localhost:15672

### Redis connection errors
- Verify Redis is running: `docker-compose ps redis_cache`
- Test connection: `docker exec -it redis_cache redis-cli ping`

## Next Steps

When the email and push services are ready:
1. Add them to `docker-compose.yml`
2. They will automatically consume from `email.queue` and `push.queue`
3. Failed messages will go to retry queues, then to `failed.queue`

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that:
- Runs tests on push/PR
- Builds Docker images
- Deploys to server (when configured with secrets)

To configure deployment, add these GitHub secrets:
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password
- `DEPLOY_HOST` - Server IP/hostname
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key


