# API Gateway Service - Distributed Notification System

## 🚀 Overview

The API Gateway service is the entry point for the Distributed Notification System, handling authentication, validation, and intelligent routing of notifications to email and push services via RabbitMQ.

## 🏗️ Architecture

```
Client Request → API Gateway → RabbitMQ → [Email Service / Push Service]
```

## 📋 Features

- **🔐 JWT Authentication** - Secure Bearer token authentication
- **⚡ Async Processing** - Fire-and-forget pattern with immediate responses
- **🔄 Intelligent Routing** - Automatically routes to email or push queues
- **🛡️ Rate Limiting** - Redis-based request throttling (100 requests/minute)
- **🔒 Idempotency** - Prevents duplicate processing with Idempotency-Key
- **⚡ Circuit Breaker** - Resilient communication with external services
- **📊 Health Monitoring** - Comprehensive health checks with dependency status
- **🐳 Docker Ready** - Full containerization support
- **📚 API Documentation** - Interactive Swagger/OpenAPI documentation

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+
- Redis
- RabbitMQ

### Installation

1. **Clone and setup:**
```bash
git clone <your-repo>
cd API-gateway-service
cp .env.example .env
```

2. **Install dependencies:**
```bash
npm install
```

3. **Setup development environment:**
```bash
# Automatic setup (Ubuntu/Debian)
npm run setup:dev

# Or manual setup
sudo apt update
sudo apt install redis-server rabbitmq-server -y
sudo systemctl enable redis-server rabbitmq-server
sudo systemctl start redis-server rabbitmq-server
sudo rabbitmq-plugins enable rabbitmq_management
```

4. **Configure environment:**
Edit `.env` file:
```env
# Server
NODE_ENV=development
PORT=3000

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production
API_KEY=gateway-api-key-12345

# Services
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
REDIS_URL=redis://localhost:6379

# External Services (for circuit breaker)
USER_SERVICE_URL=http://localhost:3001
TEMPLATE_SERVICE_URL=http://localhost:3002
```

5. **Start the service:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🐳 Docker Development

```bash
# Start all services (API Gateway, Redis, RabbitMQ)
npm run docker:dev

# Or start dependencies only
docker-compose up redis rabbitmq -d
npm run dev
```

## 📡 API Usage

### Base URL
```
http://localhost:3000
```

### Authentication
All endpoints (except health check) require JWT Bearer token authentication.

**Generate test token:**
```bash
npm run generate-token
```

### Endpoints

#### 🔍 Health Check
```http
GET /health
```

**Response:**
```json
{
  "message": "API Gateway service is healthy",
  "circuit_breakers": {
    "user_service": {
      "state": "CLOSED",
      "stats": { ... }
    },
    "template_service": {
      "state": "CLOSED", 
      "stats": { ... }
    }
  },
  "dependencies": {
    "redis": "connected",
    "rabbitmq": "connected"
  },
  "timestamp": "2023-11-11T17:42:25.247Z",
  "uptime": 865.559
}
```

#### 📨 Send Notification
```http
POST /api/v1/notify
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "user_123456",
  "template_name": "welcome_email",
  "variables": {
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "activation_link": "https://example.com/activate/123"
  }
}
```

**Success Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "notification_id": "a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2",
    "correlation_id": "a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2",
    "status": "queued",
    "queued_at": "2023-11-11T17:42:25.247Z"
  },
  "message": "Notification request accepted and is being processed.",
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

### 🔄 Idempotency

Prevent duplicate notifications by including an `Idempotency-Key` header:

```http
POST /api/v1/notify
Authorization: Bearer <your-jwt-token>
Idempotency-Key: unique-request-id-12345
Content-Type: application/json

{
  "user_id": "user_123",
  "template_name": "welcome_email",
  "variables": {"name": "John"}
}
```

### 📊 Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp
  - `Retry-After`: Seconds to wait when limited

## 🧪 Testing

### Automated Tests
```bash
# Run comprehensive test suite
npm run test:comprehensive

# Test specific functionality
npm test
npm run test:routing
npm run test:notification
```

### Manual Testing
```bash
# Generate token
npm run generate-token

# Test health endpoint
curl http://localhost:3000/health

# Test notification endpoint (replace YOUR_TOKEN)
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "test_user_123",
    "template_name": "welcome_email", 
    "variables": {
      "user_name": "John Doe",
      "user_email": "john@example.com"
    }
  }'
```

### Check RabbitMQ
```bash
# Install rabbitmqadmin
sudo rabbitmq-plugins enable rabbitmq_management

# Check queues
rabbitmqadmin list queues name messages messages_ready

# Access management UI: http://localhost:15672
# Credentials: admin/admin123 or guest/guest
```

## 📚 API Documentation

Interactive API documentation available at:
```
http://localhost:3000/docs
```

Features:
- Interactive endpoint testing
- Request/response schemas
- Authentication setup
- Error code explanations

## 🏗️ Project Structure

```
API-gateway-service/
├── src/
│   ├── app.js                 # Main application entry point
│   ├── config/               # Configuration files
│   │   ├── env.js           # Environment configuration
│   │   ├── constants.js      # Application constants
│   │   └── swagger.js       # OpenAPI documentation
│   ├── controllers/          # Request handlers
│   │   ├── health-controller.js
│   │   └── notification-controller.js
│   ├── routes/              # Route definitions
│   │   ├── index.js         # Main routes registry
│   │   ├── health-routes.js
│   │   └── notification-routes.js
│   ├── middleware/          # Middleware functions
│   │   ├── auth-middleware.js
│   │   ├── rate-limit-middleware.js
│   │   └── idempotency-middleware.js
│   ├── services/            # Business logic
│   │   ├── queue-service.js
│   │   └── notification-service.js
│   ├── utils/               # Utility functions
│   │   ├── redis-client.js
│   │   ├── rabbitmq-client.js
│   │   ├── circuit-breaker.js
│   │   └── response-formatter.js
│   └── scripts/             # Development scripts
│       └── generate-test-token.js
├── tests/                   # Test files
├── docker-compose.yml       # Development environment
├── Dockerfile              # Container configuration
├── .env.example            # Environment template
└── package.json            # Dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret | - |
| `API_KEY` | Internal API key | - |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://localhost:5672` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `USER_SERVICE_URL` | User Service URL | `http://user-service:3001` |
| `TEMPLATE_SERVICE_URL` | Template Service URL | `http://template-service:3002` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### RabbitMQ Setup

The service expects the following RabbitMQ topology:
- **Exchange**: `notifications.direct` (direct, durable)
- **Queues**: 
  - `email.queue` (with DLX to `failed.queue`)
  - `push.queue` (with DLX to `failed.queue`) 
  - `failed.queue` (dead letter queue)

## 🚀 Deployment

### Docker Production
```bash
docker build -t api-gateway-service .
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  api-gateway-service
```

### Manual Production
```bash
npm install --production
npm start
```

## 🐛 Troubleshooting

### Common Issues

**RabbitMQ Connection Failed:**
```bash
# Check RabbitMQ status
sudo systemctl status rabbitmq-server

# Reset and reconfigure
npm run setup:rabbitmq
```

**Redis Connection Failed:**
```bash
# Check Redis status
redis-cli ping

# Restart Redis
sudo systemctl restart redis-server
```

**Rate Limiting Not Working:**
- Check Redis connection
- Verify environment variables
- Check application logs

### Logs
- Application logs show request processing and errors
- RabbitMQ logs show message queueing and delivery
- Use correlation IDs for request tracing

## 🤝 Integration with Other Services

### Email Service
- Listens to `email.queue` 
- Processes email notifications
- Requires SMTP configuration

### Push Service  
- Listens to `push.queue`
- Processes push notifications
- Requires FCM/APNS configuration

### Message Format
All services receive messages in this format:
```json
{
  "notification_id": "uuid",
  "correlation_id": "uuid",
  "user_id": "user_123",
  "template_id": "template_name", 
  "type": "email|push",
  "variables": {...},
  "timestamp": "2023-11-11T17:42:25.247Z",
  "status": "queued"
}
```

## 📄 License

MIT License - see LICENSE file for details.

## 👥 Team

This service is part of the Distributed Notification System microservices architecture a task given by HNG INTERNSHIP

