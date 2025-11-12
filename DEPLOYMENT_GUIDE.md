# 🚀 Deployment Guide - HNG13 Distributed Notification System

This guide will walk you through deploying the notification system step by step.

## 📋 Prerequisites

Before you begin, ensure you have:
- Docker and Docker Compose installed
- Git installed
- Basic understanding of terminal/command line

## 🔧 Step 1: Clone and Setup

### 1.1 Clone the Repository
```bash
git clone <your-repo-url>
cd hng13-backend-stage4
```

### 1.2 Create Environment Files
The `.env` files are already created for you. Verify they exist:
```bash
# Check root .env
cat .env

# Check service .env files
cat API-gateway-service/.env
cat user-service/.env
cat template-service/.env
```

### 1.3 (Optional) Customize Environment Variables
For production, you should change:
- `JWT_SECRET` - Generate a new secure secret
- `POSTGRES_PASSWORD` - Use a strong password
- `RABBITMQ_DEFAULT_PASS` - Use a strong password

To generate a new JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🐳 Step 2: Start Services with Docker

### 2.1 Build and Start All Services
```bash
docker-compose up --build
```

This command will:
1. Build Docker images for all services
2. Start PostgreSQL database
3. Start Redis cache
4. Start RabbitMQ message broker
5. Start User Service (port 3002)
6. Start Template Service (port 3001)
7. Start API Gateway (port 3000)

### 2.2 Run in Background (Detached Mode)
```bash
docker-compose up -d --build
```

### 2.3 View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway
docker-compose logs -f user-service
docker-compose logs -f template-service
```

## ✅ Step 3: Verify Services

### 3.1 Check Service Health
```bash
# API Gateway
curl http://localhost:3000/health

# User Service
curl http://localhost:3002/health

# Template Service
curl http://localhost:3001/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "api-gateway"
  },
  "message": "Service is healthy",
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

### 3.2 Check Docker Containers
```bash
docker-compose ps
```

All services should show "Up" status.

### 3.3 Access Management UIs

**RabbitMQ Management Console:**
- URL: http://localhost:15672
- Username: `admin`
- Password: `password`

You should see the following queues:
- `email.queue`
- `push.queue`
- `email.queue.retry`
- `push.queue.retry`
- `failed.queue`

## 🧪 Step 4: Test the System

### 4.1 Create a Test User
```bash
curl -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "push_token": "test-push-token-123"
  }'
```

Save the `user_id` from the response.

### 4.2 Create a Test Template
```bash
curl -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "content": "Hello {{name}}, welcome to our platform!",
    "type": "email",
    "subject": "Welcome!",
    "language": "en",
    "version": 1,
    "variables": ["name"]
  }'
```

### 4.3 Generate JWT Token
```bash
cd API-gateway-service
npm install
node src/scripts/generate-test-token.js
```

Copy the generated token.

### 4.4 Send a Test Notification
```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Idempotency-Key: test-notification-001" \
  -d '{
    "user_id": "1",
    "template_name": "welcome_email",
    "variables": {
      "name": "Test User"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Notification request accepted and is being processed.",
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

### 4.5 Verify Message in RabbitMQ
1. Go to http://localhost:15672
2. Click on "Queues" tab
3. Check `email.queue` - you should see 1 message

## 🔍 Step 5: Monitoring

### 5.1 View Service Logs
```bash
# Real-time logs
docker-compose logs -f api-gateway

# Last 100 lines
docker-compose logs --tail=100 user-service
```

### 5.2 Check Database
```bash
# Connect to PostgreSQL
docker exec -it postgres_db psql -U hng_user -d user_db

# View users
SELECT * FROM users;

# Switch to template database
\c template_db

# View templates
SELECT * FROM templates;

# Exit
\q
```

### 5.3 Check Redis Cache
```bash
# Connect to Redis
docker exec -it redis_cache redis-cli

# View all keys
KEYS *

# Get a specific key
GET user:1

# Exit
exit
```

## 🛑 Step 6: Stop Services

### 6.1 Stop All Services
```bash
docker-compose down
```

### 6.2 Stop and Remove Volumes (Clean Slate)
```bash
docker-compose down -v
```

⚠️ **Warning:** This will delete all data in the databases!

## 🔄 Step 7: Update and Restart

### 7.1 Pull Latest Changes
```bash
git pull origin main
```

### 7.2 Rebuild and Restart
```bash
docker-compose down
docker-compose up --build -d
```

### 7.3 View Updated Logs
```bash
docker-compose logs -f
```

## 🐛 Troubleshooting

### Issue: Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change port in docker-compose.yml
```

### Issue: Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres_db

# View PostgreSQL logs
docker-compose logs postgres_db

# Restart PostgreSQL
docker-compose restart postgres_db
```

### Issue: RabbitMQ Connection Failed
```bash
# Check RabbitMQ status
docker-compose ps rabbitmq

# View RabbitMQ logs
docker-compose logs rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq
```

### Issue: Service Won't Start
```bash
# Check logs for specific service
docker-compose logs api-gateway

# Rebuild specific service
docker-compose up --build api-gateway

# Remove and recreate
docker-compose rm -f api-gateway
docker-compose up -d api-gateway
```

## 📊 Performance Targets

The system is designed to meet these targets:
- ✅ Handle 1,000+ notifications per minute
- ✅ API Gateway response under 100ms
- ✅ 99.5% delivery success rate
- ✅ All services support horizontal scaling

## 🔐 Security Checklist for Production

- [ ] Change all default passwords
- [ ] Generate new JWT secret
- [ ] Enable SSL/TLS for databases
- [ ] Use environment-specific .env files
- [ ] Enable firewall rules
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Implement rate limiting per user
- [ ] Enable audit logging

## 📚 Additional Resources

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Detailed setup instructions
- [README.md](./README.md) - Project overview
- [API Gateway README](./API-gateway-service/README.md) - API documentation
- [Swagger Docs](http://localhost:3000/docs) - Interactive API documentation

## 🆘 Getting Help

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Check health endpoints
4. Review this guide's troubleshooting section
5. Contact the team lead

---

**Last Updated:** 2025-11-12
**Version:** 1.0.0

