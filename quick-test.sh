#!/bin/bash

# Quick Test Script for Distributed Notification System
# This script performs basic verification of all services

set -e

echo "🚀 Starting Quick Test..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if services are running
echo "📋 Step 1: Checking if services are running..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services are running${NC}"
    docker-compose ps
else
    echo -e "${RED}❌ Services are not running. Starting them...${NC}"
    docker-compose up -d
    echo "⏳ Waiting 30 seconds for services to start..."
    sleep 30
fi

echo ""
echo "📋 Step 2: Testing Health Endpoints..."

# Test API Gateway
echo -n "  Testing API Gateway... "
if curl -s http://localhost:3000/health | grep -q '"message"'; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Test User Service
echo -n "  Testing User Service... "
if curl -s http://localhost:3002/health | grep -q '"success":true'; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Test Template Service
echo -n "  Testing Template Service... "
if curl -s http://localhost:3001/health | grep -q '"success":true'; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Test Email Service
echo -n "  Testing Email Service... "
if curl -s http://localhost:3003/health | grep -q '"success":true'; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Test Push Service
echo -n "  Testing Push Service... "
if curl -s http://localhost:3004/health | grep -q '"success":true'; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo ""
echo "📋 Step 3: Creating test user..."
USER_RESPONSE=$(curl -s -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "push_token": "fcm-token-test-123456789"
  }')

if echo "$USER_RESPONSE" | grep -q '"success":true'; then
    USER_ID=$(echo "$USER_RESPONSE" | grep -o '"user_id":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✅ User created with ID: $USER_ID${NC}"
else
    echo -e "${RED}❌ Failed to create user${NC}"
    echo "$USER_RESPONSE"
    exit 1
fi

echo ""
echo "📋 Step 4: Creating email template..."
TEMPLATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "type": "email",
    "subject": "Welcome {{user_name}}!",
    "content": "<h1>Hello {{user_name}}</h1><p>Welcome to our platform!</p>",
    "language": "en"
  }')

if echo "$TEMPLATE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Email template created${NC}"
else
    echo -e "${RED}❌ Failed to create template${NC}"
    echo "$TEMPLATE_RESPONSE"
    exit 1
fi

echo ""
echo "📋 Step 5: Generating JWT token..."
cd API-gateway-service
TOKEN=$(node src/scripts/generate-test-token.js 2>/dev/null | tail -1)
cd ..

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ Token generated${NC}"
    echo "Token: ${TOKEN:0:50}..."
else
    echo -e "${RED}❌ Failed to generate token${NC}"
    exit 1
fi

echo ""
echo "📋 Step 6: Sending test notification..."
NOTIFICATION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: quick-test-$(date +%s)" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"template_name\": \"welcome_email\",
    \"variables\": {
      \"user_name\": \"Test User\"
    }
  }")

if echo "$NOTIFICATION_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Notification sent successfully${NC}"
else
    echo -e "${RED}❌ Failed to send notification${NC}"
    echo "$NOTIFICATION_RESPONSE"
    exit 1
fi

echo ""
echo "⏳ Waiting 5 seconds for notification to process..."
sleep 5

echo ""
echo "📋 Step 7: Checking service logs..."
echo ""
echo "Email Service logs (last 5 lines):"
docker-compose logs email_service --tail=5 2>/dev/null | grep -E "(Processing|sent|error)" || echo "No relevant logs"

echo ""
echo "Push Service logs (last 5 lines):"
docker-compose logs push_service --tail=5 2>/dev/null | grep -E "(Processing|sent|error)" || echo "No relevant logs"

echo ""
echo -e "${GREEN}✅ Quick test completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Check full logs: docker-compose logs"
echo "2. Access Swagger UI: http://localhost:3000/docs"
echo "3. Access RabbitMQ UI: http://localhost:15672 (admin/password)"
echo "4. See TESTING_GUIDE.md for comprehensive testing"

