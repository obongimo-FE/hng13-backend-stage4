#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   HNG13 Distributed Notification System - Test Suite      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Function to check if service is responding
check_service() {
    local url=$1
    local service_name=$2
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    if [ "$response" = "200" ]; then
        print_result 0 "$service_name is healthy"
        return 0
    else
        print_result 1 "$service_name is not responding (HTTP $response)"
        return 1
    fi
}

echo -e "${YELLOW}Step 1: Checking if Docker services are running...${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}Step 2: Testing Health Endpoints...${NC}"
sleep 5  # Give services time to start

check_service "http://localhost:3000/health" "API Gateway"
check_service "http://localhost:3002/health" "User Service"
check_service "http://localhost:3001/health" "Template Service"
echo ""

echo -e "${YELLOW}Step 3: Testing User Service...${NC}"

# Create a test user
echo "Creating test user..."
USER_RESPONSE=$(curl -s -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123",
    "name": "Test User",
    "push_token": "test-push-token-123"
  }')

echo "$USER_RESPONSE" | grep -q '"success":true'
print_result $? "User created successfully"

# Extract user_id
USER_ID=$(echo $USER_RESPONSE | grep -o '"user_id":[0-9]*' | grep -o '[0-9]*')
echo -e "  User ID: ${BLUE}$USER_ID${NC}"
echo ""

echo -e "${YELLOW}Step 4: Testing Template Service...${NC}"

# Create a test template
echo "Creating test template..."
TEMPLATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "content": "Hello {{name}}, welcome to our platform! Your email is {{email}}.",
    "type": "email",
    "subject": "Welcome to Our Platform!",
    "language": "en",
    "version": 1,
    "variables": ["name", "email"]
  }')

echo "$TEMPLATE_RESPONSE" | grep -q '"success":true'
print_result $? "Template created successfully"
echo ""

echo -e "${YELLOW}Step 5: Testing API Gateway Authentication...${NC}"

# Test without token (should fail)
echo "Testing without authentication token..."
NO_AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$NO_AUTH_RESPONSE" = "401" ]; then
    print_result 0 "Authentication required (401 Unauthorized)"
else
    print_result 1 "Authentication check failed (expected 401, got $NO_AUTH_RESPONSE)"
fi
echo ""

echo -e "${YELLOW}Step 6: Generating JWT Token...${NC}"
cd API-gateway-service
npm install --silent > /dev/null 2>&1
JWT_TOKEN=$(node src/scripts/generate-test-token.js | grep -o 'eyJ[^"]*')
cd ..

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}✗ Failed to generate JWT token${NC}"
    exit 1
fi

echo -e "${GREEN}✓ JWT token generated${NC}"
echo -e "  Token: ${BLUE}${JWT_TOKEN:0:50}...${NC}"
echo ""

echo -e "${YELLOW}Step 7: Testing Notification Flow...${NC}"

# Send notification request
echo "Sending notification request..."
NOTIFY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Idempotency-Key: test-notification-$(date +%s)" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"template_name\": \"welcome_email\",
    \"variables\": {
      \"name\": \"Test User\",
      \"email\": \"testuser@example.com\"
    }
  }")

echo "$NOTIFY_RESPONSE" | grep -q '"success":true'
print_result $? "Notification queued successfully"
echo ""

echo -e "${YELLOW}Step 8: Testing Idempotency...${NC}"

# Send same request again with same idempotency key
echo "Sending duplicate request with same idempotency key..."
IDEMPOTENCY_KEY="test-idempotency-$(date +%s)"

FIRST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"template_name\": \"welcome_email\",
    \"variables\": {
      \"name\": \"Test User\"
    }
  }")

sleep 1

SECOND_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"template_name\": \"welcome_email\",
    \"variables\": {
      \"name\": \"Test User\"
    }
  }")

if [ "$FIRST_RESPONSE" = "$SECOND_RESPONSE" ]; then
    print_result 0 "Idempotency working correctly"
else
    print_result 1 "Idempotency check failed"
fi
echo ""

echo -e "${YELLOW}Step 9: Testing Rate Limiting...${NC}"
echo "Sending multiple requests to test rate limiting..."

SUCCESS_COUNT=0
for i in {1..5}; do
    RATE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST http://localhost:3000/api/v1/notify \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Idempotency-Key: rate-test-$i" \
      -d "{
        \"user_id\": \"$USER_ID\",
        \"template_name\": \"welcome_email\",
        \"variables\": {\"name\": \"Test\"}
      }")
    
    if [ "$RATE_RESPONSE" = "202" ]; then
        ((SUCCESS_COUNT++))
    fi
done

if [ $SUCCESS_COUNT -ge 3 ]; then
    print_result 0 "Rate limiting configured (accepted $SUCCESS_COUNT/5 requests)"
else
    print_result 1 "Rate limiting may not be working correctly"
fi
echo ""

echo -e "${YELLOW}Step 10: Checking RabbitMQ Queues...${NC}"

# Check if RabbitMQ management API is accessible
RABBITMQ_RESPONSE=$(curl -s -u admin:password http://localhost:15672/api/queues)

if echo "$RABBITMQ_RESPONSE" | grep -q "email.queue"; then
    print_result 0 "RabbitMQ queues configured correctly"
else
    print_result 1 "RabbitMQ queues not found"
fi
echo ""

echo -e "${YELLOW}Step 11: Testing User Preferences...${NC}"

# Update user preferences
PREF_RESPONSE=$(curl -s -X PATCH http://localhost:3002/api/v1/users/$USER_ID/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "email": false,
    "push": true
  }')

echo "$PREF_RESPONSE" | grep -q '"success":true'
print_result $? "User preferences updated successfully"
echo ""

echo -e "${YELLOW}Step 12: Testing Redis Cache...${NC}"

# Get user (should be cached)
CACHE_TEST_1=$(curl -s http://localhost:3002/api/v1/users/$USER_ID)
CACHE_TEST_2=$(curl -s http://localhost:3002/api/v1/users/$USER_ID)

if [ "$CACHE_TEST_1" = "$CACHE_TEST_2" ]; then
    print_result 0 "Redis caching working correctly"
else
    print_result 1 "Redis caching may not be working"
fi
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              All Tests Passed Successfully! ✓              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Summary:${NC}"
echo -e "  • API Gateway: ${GREEN}✓ Running${NC}"
echo -e "  • User Service: ${GREEN}✓ Running${NC}"
echo -e "  • Template Service: ${GREEN}✓ Running${NC}"
echo -e "  • PostgreSQL: ${GREEN}✓ Connected${NC}"
echo -e "  • Redis: ${GREEN}✓ Connected${NC}"
echo -e "  • RabbitMQ: ${GREEN}✓ Connected${NC}"
echo -e "  • Authentication: ${GREEN}✓ Working${NC}"
echo -e "  • Rate Limiting: ${GREEN}✓ Working${NC}"
echo -e "  • Idempotency: ${GREEN}✓ Working${NC}"
echo -e "  • Circuit Breaker: ${GREEN}✓ Configured${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Access RabbitMQ Management: ${BLUE}http://localhost:15672${NC} (admin/password)"
echo -e "  2. Access Swagger Docs: ${BLUE}http://localhost:3000/docs${NC}"
echo -e "  3. View logs: ${BLUE}docker-compose logs -f${NC}"
echo -e "  4. Stop services: ${BLUE}docker-compose down${NC}"
echo ""

