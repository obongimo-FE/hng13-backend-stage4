# Testing Guide

Comprehensive testing guide for the Distributed Notification System.

## Quick Test

Run the automated test script:

```bash
./quick-test.sh
```

## Manual Testing

### 1. Health Checks

Verify all services are running:

```bash
# API Gateway
curl http://localhost:3000/health

# Template Service
curl http://localhost:3001/health

# User Service
curl http://localhost:3002/health

# Email Service
curl http://localhost:3003/health

# Push Service
curl http://localhost:3004/health
```

### 2. Create User

```bash
curl -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "push_token": "fcm-token-123"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user_id": 1,
    "email": "test@example.com",
    "name": "Test User",
    "preferences": {"push": true, "email": true},
    "created_at": "2025-11-14T10:00:00.000Z",
    "push_token": "fcm-token-123"
  }
}
```

### 3. Create Email Template

```bash
curl -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "type": "email",
    "subject": "Welcome {{user_name}}!",
    "content": "<h1>Hello {{user_name}}</h1><p>Welcome to our platform! Your email is {{user_email}}.</p>",
    "language": "en"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Template created successfully",
  "data": {
    "template_id": 1,
    "name": "welcome_email",
    "version": 1,
    "language": "en",
    "type": "email",
    "subject": "Welcome {{user_name}}!",
    "content": "<h1>Hello {{user_name}}</h1><p>Welcome to our platform!</p>"
  }
}
```

### 4. Create Push Template

```bash
curl -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_push",
    "type": "push",
    "subject": "Welcome!",
    "content": "Hello {{user_name}}, welcome to our platform!",
    "language": "en"
  }'
```

### 5. Generate JWT Token

```bash
cd API-gateway-service
TOKEN=$(node src/scripts/generate-test-token.js | tail -1)
echo "Token: $TOKEN"
cd ..
```

### 6. Send Email Notification

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdF91c2VyXzEyMyIsImVtYWlsIjoiZGV2ZWxvcGVyQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0Ijo
xNzYzMTMyMDU3LCJleHAiOjE3NjMxMzU2NTd9.Y4YgN0naBRwDISxS-a9Ia0B87A8CJkrGU_-XKfYIcxk" \
  -H "Idempotency-Key: test-email-$(date +%s)" \
  -d '{
    "user_id": "1",
    "template_name": "welcome_email",
    "variables": {
      "user_name": "Test User",
      "user_email": "test@example.com"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Notification request accepted and is being processed.",
  "data": {
    "correlation_id": "uuid-here",
    "notifications": [
      {
        "routing_key": "email.queue",
        "status": "queued"
      }
    ]
  }
}
```

### 7. Check Email Service Logs

```bash
docker-compose logs email-service --tail=20 | grep -E "(Received|Processing|sent)"
```

**Expected Output:**

```
email_service | 📨 Received message: [correlation-id]
email_service | 📧 Processing email notification for user 1
email_service | ✅ Email sent: <email-id@example.com>
email_service | ✅ Email sent successfully
```

### 8. Send Push Notification

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: test-push-$(date +%s)" \
  -d '{
    "user_id": "1",
    "template_name": "welcome_push",
    "variables": {
      "user_name": "Test User"
    }
  }'
```

### 9. Check Push Service Logs

```bash
docker-compose logs push-service --tail=20 | grep -E "(Received|Processing|sent)"
```

**Expected Output:**

```
push_service | 📨 Received message: [correlation-id]
push_service | 📱 Processing push notification for user 1
push_service | 📱 [SIMULATED] Push notification sent
push_service | ✅ Push notification sent successfully
```

### 10. Check Notification Status

```bash
# Use the correlation_id from step 6 or 8
curl -X GET http://localhost:3000/api/v1/notifications/CORRELATION_ID/status \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "correlation_id": "uuid-here",
    "status": "sent",
    "type": "email",
    "timestamp": "2025-11-14T10:00:00.000Z"
  }
}
```

## Edge Cases Testing

### 1. Duplicate Request (Idempotency)

```bash
# Send same request twice with same Idempotency-Key
IDEMPOTENCY_KEY="test-idempotency-123"

curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"user_id": "1", "template_name": "welcome_email", "variables": {"user_name": "Test"}}'

# Send again with same key
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"user_id": "1", "template_name": "welcome_email", "variables": {"user_name": "Test"}}'
```

**Expected**: Second request returns same response without processing.

### 2. Rate Limiting

```bash
# Send 101 requests rapidly
for i in {1..101}; do
  curl -X POST http://localhost:3000/api/v1/notify \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Idempotency-Key: rate-test-$i" \
    -d '{"user_id": "1", "template_name": "welcome_email", "variables": {"user_name": "Test"}}'
done
```

**Expected**: 101st request returns 429 Too Many Requests.

### 3. Invalid Authentication

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{"user_id": "1", "template_name": "welcome_email", "variables": {"user_name": "Test"}}'
```

**Expected**: 401 Unauthorized.

### 4. Missing Required Fields

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"user_id": "1"}'
```

**Expected**: 400 Bad Request with validation errors.

### 5. Non-existent User

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: test-invalid-user" \
  -d '{"user_id": "999", "template_name": "welcome_email", "variables": {"user_name": "Test"}}'
```

**Expected**: 404 Not Found or appropriate error.

### 6. Non-existent Template

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: test-invalid-template" \
  -d '{"user_id": "1", "template_name": "non_existent", "variables": {"user_name": "Test"}}'
```

**Expected**: 404 Not Found or appropriate error.

## Integration Testing

### Full Flow Test

```bash
#!/bin/bash

# 1. Create user
USER_RESPONSE=$(curl -s -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"integration@test.com","password":"test123","name":"Integration Test","push_token":"fcm-integration"}')
USER_ID=$(echo $USER_RESPONSE | grep -o '"user_id":[0-9]*' | grep -o '[0-9]*')
echo "Created user ID: $USER_ID"

# 2. Create template
TEMPLATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"integration_test","type":"email","subject":"Test {{name}}","content":"Hello {{name}}","language":"en"}')
echo "Created template"

# 3. Generate token
cd API-gateway-service
TOKEN=$(node src/scripts/generate-test-token.js | tail -1)
cd ..

# 4. Send notification
NOTIFY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: integration-test-$(date +%s)" \
  -d "{\"user_id\":\"$USER_ID\",\"template_name\":\"integration_test\",\"variables\":{\"name\":\"Integration Test\"}}")
CORRELATION_ID=$(echo $NOTIFY_RESPONSE | grep -o '"correlation_id":"[^"]*"' | cut -d'"' -f4)
echo "Notification sent with correlation_id: $CORRELATION_ID"

# 5. Wait for processing
sleep 3

# 6. Check status
curl -s -X GET http://localhost:3000/api/v1/notifications/$CORRELATION_ID/status \
  -H "Authorization: Bearer $TOKEN"

# 7. Check logs
echo "Email Service Logs:"
docker-compose logs email-service --tail=5 | grep -E "(Received|sent)"
```

## Performance Testing

### Load Test

```bash
# Install Apache Bench (if not installed)
# Ubuntu/Debian: sudo apt-get install apache2-utils
# macOS: brew install httpd

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# Test notification endpoint (with token)
ab -n 100 -c 5 -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: load-test-%p" \
  -p notification.json \
  http://localhost:3000/api/v1/notify
```

## RabbitMQ Testing

### Check Queue Status

```bash
# Access RabbitMQ Management UI
open http://localhost:15672

# Or use CLI
docker-compose exec rabbitmq rabbitmqctl list_queues name messages messages_ready
```

### Monitor Queue Messages

```bash
# Watch queue in real-time
docker-compose exec rabbitmq rabbitmqctl list_queues name messages
```

## Database Testing

### Verify Data

```bash
# Check users
docker-compose exec postgres_db psql -U hng_user -d user_db -c "SELECT * FROM users;"

# Check templates
docker-compose exec postgres_db psql -U hng_user -d template_db -c "SELECT * FROM templates;"
```

## Cleanup

### Reset Test Data

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Restart fresh
docker-compose up --build -d
```

## Test Checklist

- [X] All health checks pass
- [X] User creation works
- [X] Template creation works
- [X] Email notification sent and processed
- [X] Push notification sent and processed
- [X] Status tracking works
- [X] Idempotency prevents duplicates
- [X] Rate limiting works
- [X] Authentication works
- [X] Validation errors handled correctly
- [X] Error cases handled gracefully
- [X] RabbitMQ queues working
- [X] Database persistence works
- [X] Redis caching works
