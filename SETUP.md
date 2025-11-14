# Setup Guide

Complete setup instructions for the Distributed Notification System.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd hng13-backend-stage4
```

### 2. Environment Variables (Optional)

Default values are provided in `docker-compose.yml`. Create a `.env` file for custom configuration:

```env
# JWT Secret for API Gateway
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database
POSTGRES_USER=hng_user
POSTGRES_PASSWORD=hng_pass

# RabbitMQ
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=password

# Email Service (optional - for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDGRID_API_KEY=your-sendgrid-api-key
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.com

# Push Service (optional - for production)
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

### 3. Start All Services

```bash
# Start all services in detached mode
docker-compose up --build -d

# Or start in foreground (to see logs)
docker-compose up --build
```

This will start:
- **PostgreSQL** (port 5433) - Separate databases for user-service and template-service
- **Redis** (port 6379) - Caching and rate limiting
- **RabbitMQ** (ports 5672, 15672) - Message queue
- **User Service** (port 3002) - User management
- **Template Service** (port 3001) - Template management
- **Email Service** (port 3003) - Email notifications
- **Push Service** (port 3004) - Push notifications
- **API Gateway** (port 3000) - Entry point

### 4. Verify Services

```bash
# Check service status
docker-compose ps

# Test health endpoints
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Template Service
curl http://localhost:3002/health  # User Service
curl http://localhost:3003/health  # Email Service
curl http://localhost:3004/health  # Push Service
```

### 5. Access Management UIs

- **Swagger API Documentation**: http://localhost:3000/docs
- **RabbitMQ Management**: http://localhost:15672
  - Username: `admin`
  - Password: `password`

## Service Configuration

### API Gateway

**Port**: 3000

**Environment Variables:**
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret
RABBITMQ_URL=amqp://rabbitmq:5672
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=password
REDIS_URL=redis://redis_cache:6379
USER_SERVICE_URL=http://user-service:3002
TEMPLATE_SERVICE_URL=http://template-service:3001
```

**Generate Test Token:**
```bash
cd API-gateway-service
npm install
node src/scripts/generate-test-token.js
```

### User Service

**Port**: 3002

**Environment Variables:**
```env
NODE_ENV=development
PORT=3002
DATABASE_URL=postgres://hng_user:hng_pass@postgres_db:5432/user_db
REDIS_URL=redis://redis_cache:6379
```

### Template Service

**Port**: 3001

**Environment Variables:**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://hng_user:hng_pass@postgres_db:5432/template_db
```

### Email Service

**Port**: 3003

**Environment Variables:**
```env
NODE_ENV=development
PORT=3003
RABBITMQ_URL=amqp://rabbitmq:5672
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=password
REDIS_URL=redis://redis_cache:6379

# Optional - Email Providers
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDGRID_API_KEY=your-sendgrid-key
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-domain.com
```

**Note**: Without email configuration, the service uses Ethereal Email for development testing.

### Push Service

**Port**: 3004

**Environment Variables:**
```env
NODE_ENV=development
PORT=3004
RABBITMQ_URL=amqp://rabbitmq:5672
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=password
REDIS_URL=redis://redis_cache:6379

# Optional - FCM Configuration
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

**Note**: Without FCM configuration, push notifications are simulated.

## Database Setup

Databases are automatically created on first startup via `init-db.sh`:

- `user_db` - User Service database
- `template_db` - Template Service database

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose logs [service-name]

# Restart a specific service
docker-compose restart [service-name]

# Rebuild and restart
docker-compose up --build -d [service-name]
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres_db

# Verify database exists
docker-compose exec postgres_db psql -U hng_user -d user_db -c "\dt"
```

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ logs
docker-compose logs rabbitmq

# Verify RabbitMQ is healthy
docker-compose exec rabbitmq rabbitmqctl status

# Access management UI
open http://localhost:15672
```

### Port Conflicts

If ports are already in use, modify `docker-compose.yml` to use different ports.

## Production Setup

### 1. Environment Variables

Set all required environment variables in production:

```env
NODE_ENV=production
JWT_SECRET=<strong-secret-key>
SMTP_HOST=<production-smtp>
SMTP_USER=<production-email>
SMTP_PASSWORD=<production-password>
FCM_SERVICE_ACCOUNT_JSON=<production-fcm-json>
```

### 2. Database Backups

Set up regular PostgreSQL backups:

```bash
# Backup script example
docker-compose exec postgres_db pg_dump -U hng_user user_db > backup_user_db.sql
docker-compose exec postgres_db pg_dump -U hng_user template_db > backup_template_db.sql
```

### 3. Monitoring

- Set up health check monitoring
- Configure log aggregation
- Set up alerting for service failures
- Monitor RabbitMQ queue lengths

### 4. Security

- Use strong JWT secrets
- Enable HTTPS/TLS
- Restrict network access
- Use secrets management (e.g., Docker secrets, AWS Secrets Manager)

## Next Steps

After setup, proceed to [TESTING.md](./TESTING.md) to test the system.

