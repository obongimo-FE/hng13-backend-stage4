# Distributed Notification System

A production-ready microservices-based notification system that sends emails and push notifications using separate services communicating asynchronously through RabbitMQ. Built for HNG13 Backend Stage 4.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (3000)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │   JWT    │ │   Rate   │ │Idempotency│ │ Circuit  │      │
│  │   Auth   │ │  Limit   │ │           │ │ Breaker  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└────────────┬───────────────────────┬────────────────────────┘
             │                       │
             │ REST                  │ REST
    ┌────────▼────────┐    ┌────────▼────────┐
    │  User Service    │    │ Template Service│
    │   (Port 3002)    │    │   (Port 3001)   │
    └────────┬────────┘    └────────┬────────┘
             │                      │
             └──────────┬───────────┘
                        │
                   PostgreSQL
              (user_db, template_db)
                        
┌─────────────────────────────────────────────────────────────┐
│                  RabbitMQ Message Queue                     │
│                                                              │
│  Exchange: notifications.direct                              │
│  ├── email.queue ────────────┐                              │
│  ├── push.queue ─────────────┤                              │
│  └── failed.queue (DLQ)      │                              │
└──────────────────────────────┼──────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
    ┌───────────▼──────────┐      ┌───────────▼──────────┐
    │  Email Service        │      │  Push Service        │
    │  (Port 3003)          │      │  (Port 3004)         │
    └───────────────────────┘      └──────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Start All Services

```bash
# Clone the repository
git clone <repository-url>
cd hng13-backend-stage4

# Start all services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Verify Services

```bash
# Health checks
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Template Service
curl http://localhost:3002/health  # User Service
curl http://localhost:3003/health  # Email Service
curl http://localhost:3004/health  # Push Service
```

### Access Management UIs

- **Swagger API Documentation**: http://localhost:3000/docs
- **RabbitMQ Management**: http://localhost:15672
  - Username: `admin`
  - Password: `password`

## 📋 Services

### 1. API Gateway (Port 3000)

**Entry point for all notification requests**

**Features:**
- ✅ JWT Authentication
- ✅ Rate Limiting (100 requests/minute)
- ✅ Idempotency Support
- ✅ Circuit Breaker Pattern
- ✅ Request Validation
- ✅ Intelligent Routing (Email vs Push)
- ✅ Status Tracking

**Endpoints:**
- `GET /health` - Health check
- `POST /api/v1/notify` - Send notification (requires JWT)
- `GET /api/v1/notifications/:correlation_id/status` - Get notification status

### 2. User Service (Port 3002)

**User management and preferences**

**Features:**
- ✅ User Registration & Authentication
- ✅ Preference Management
- ✅ Redis Caching
- ✅ PostgreSQL Storage

**Endpoints:**
- `GET /health` - Health check
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/login` - User login
- `PATCH /api/v1/users/:id/preferences` - Update preferences

### 3. Template Service (Port 3001)

**Template storage and management**

**Features:**
- ✅ Template CRUD Operations
- ✅ Versioning Support
- ✅ Multi-language Support
- ✅ Variable Substitution

**Endpoints:**
- `GET /health` - Health check
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/:name` - Get template (supports `?version=1&language=en`)

### 4. Email Service (Port 3003)

**Email notification processing**

**Features:**
- ✅ Consumes from `email.queue`
- ✅ SMTP Support (Gmail, custom SMTP)
- ✅ SendGrid API Support
- ✅ Mailgun API Support
- ✅ Template Variable Substitution
- ✅ Status Tracking
- ✅ Ethereal Email (development)

**Endpoints:**
- `GET /health` - Health check

### 5. Push Service (Port 3004)

**Push notification processing**

**Features:**
- ✅ Consumes from `push.queue`
- ✅ FCM (Firebase Cloud Messaging) Support
- ✅ Device Token Validation
- ✅ Rich Notifications (title, body, image, link)
- ✅ Template Variable Substitution
- ✅ Status Tracking

**Endpoints:**
- `GET /health` - Health check

## 🔧 Key Technical Concepts

### Circuit Breaker
Prevents cascading failures when downstream services are unavailable. Automatically opens after failure threshold and attempts recovery.

### Retry System
- Exponential backoff retry mechanism
- Configurable retry attempts
- Dead letter queue for permanent failures
- Message TTL (60 seconds)

### Service Discovery
Services communicate via Docker network using service names:
- `user-service:3002`
- `template-service:3001`
- `api-gateway:3000`

### Health Checks
All services expose `/health` endpoints for monitoring and orchestration.

### Idempotency
Prevent duplicate notifications using `Idempotency-Key` header. Same key returns same response.

### Message Queue
- **Exchange**: `notifications.direct`
- **Queues**: `email.queue`, `push.queue`, `failed.queue`
- **Retry Logic**: Exponential backoff with max 3 retries
- **DLQ**: Permanent failures moved to `failed.queue`

## 📡 API Usage

### Generate JWT Token

```bash
cd API-gateway-service
node src/scripts/generate-test-token.js
```

### Send Notification

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Idempotency-Key: unique-request-id-123" \
  -d '{
    "user_id": "1",
    "template_name": "welcome_email",
    "variables": {
      "user_name": "John Doe",
      "user_email": "john@example.com"
    }
  }'
```

### Check Notification Status

```bash
curl -X GET http://localhost:3000/api/v1/notifications/CORRELATION_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Response Format

All services follow a standardized response format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
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

**Error Response:**
```json
{
  "success": false,
  "error": "error_code",
  "message": "Error message",
  "meta": {
    "total": 0,
    "limit": 1,
    "page": 1,
    "total_pages": 1,
    "has_next": false,
    "has_previous": false
  }
}
```

## 🗄️ Data Storage

### PostgreSQL Databases
- **user_db**: User data, preferences
- **template_db**: Templates, versions

### Redis
- User data caching
- Rate limiting
- Notification status tracking
- Idempotency keys

### RabbitMQ
- Message queue for async processing
- Retry queues
- Dead letter queue

## 🔐 Environment Variables

Key environment variables (see `docker-compose.yml` for defaults):

```env
# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Database
POSTGRES_USER=hng_user
POSTGRES_PASSWORD=hng_pass
DATABASE_URL=postgres://hng_user:hng_pass@postgres_db:5432/user_db

# RabbitMQ
RABBITMQ_URL=amqp://rabbitmq:5672
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=password

# Redis
REDIS_URL=redis://redis_cache:6379

# Email Service (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDGRID_API_KEY=your-sendgrid-key
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-domain.com

# Push Service (optional)
FCM_SERVICE_ACCOUNT_JSON=your-fcm-service-account-json
```

See [SETUP.md](./SETUP.md) for detailed configuration.

## 🧪 Testing

### Quick Test

```bash
# Run automated test script
./quick-test.sh
```

### Manual Testing

See [TESTING.md](./TESTING.md) for comprehensive testing guide.

### Test End-to-End Flow

1. **Create User:**
```bash
curl -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "push_token": "fcm-token-here"
  }'
```

2. **Create Template:**
```bash
curl -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "type": "email",
    "subject": "Welcome {{user_name}}!",
    "content": "Hello {{user_name}}, welcome to our platform!",
    "language": "en"
  }'
```

3. **Send Notification:**
```bash
# Generate token first
cd API-gateway-service
TOKEN=$(node src/scripts/generate-test-token.js | tail -1)
cd ..

# Send notification
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: test-123" \
  -d '{
    "user_id": "1",
    "template_name": "welcome_email",
    "variables": {
      "user_name": "Test User"
    }
  }'
```

4. **Check Logs:**
```bash
docker-compose logs email-service --tail=10
docker-compose logs push-service --tail=10
```

## 🚢 Deployment

### Docker Compose

The system is fully containerized and ready for deployment:

```bash
docker-compose up -d
```

### CI/CD

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):
- Runs tests
- Builds Docker images
- Deploys to server (when configured)

### Production Considerations

- Set strong `JWT_SECRET`
- Configure production email/push providers
- Set up proper database backups
- Configure monitoring and alerting
- Use environment-specific configurations
- Enable HTTPS/TLS
- Set up proper logging aggregation

## 📈 Performance Targets

- ✅ Handle 1,000+ notifications per minute
- ✅ API Gateway response under 100ms
- ✅ 99.5% delivery success rate
- ✅ All services support horizontal scaling

## ✅ Requirements Checklist

All Stage 4 requirements have been implemented:

- ✅ API Gateway with validation and authentication
- ✅ User Service with preferences
- ✅ Template Service with versioning
- ✅ Email Service with SMTP/API support
- ✅ Push Service with FCM support
- ✅ RabbitMQ message queue setup
- ✅ Circuit breaker pattern
- ✅ Retry system with exponential backoff
- ✅ Dead letter queue
- ✅ Health check endpoints
- ✅ Idempotency support
- ✅ Response format standardization (snake_case)
- ✅ Separate databases per service
- ✅ Docker containerization
- ✅ Swagger/OpenAPI documentation
- ✅ CI/CD workflow
- ✅ Status tracking

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[TESTING.md](./TESTING.md)** - Comprehensive testing guide
- **Swagger UI**: http://localhost:3000/docs - Interactive API documentation

## 🛠️ Development

### Local Development

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

### Project Structure

```
hng13-backend-stage4/
├── API-gateway-service/    # API Gateway service
├── user-service/           # User management service
├── template-service/       # Template management service
├── email-service/         # Email notification service
├── push-service/          # Push notification service
├── docker-compose.yml     # Service orchestration
├── init-db.sh            # Database initialization
└── README.md             # This file
```

## 🤝 Contributing

This project was built collaboratively by a team of 4 developers for HNG13 Backend Stage 4.

## 📄 License

This project is part of the HNG13 Internship program.

---

**Built with ❤️ for HNG13 Backend Stage 4**
