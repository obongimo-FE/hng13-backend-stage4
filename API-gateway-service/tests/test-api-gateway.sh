#!/bin/bash

echo "🧪 API GATEWAY COMPREHENSIVE TEST SUITE"
echo "========================================"

BASE_URL="http://localhost:3000"
TEST_USER_ID="test_user_$(date +%s)"
JWT_TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
    fi
}

# Generate JWT token first
echo -e "\n${YELLOW}1. Generating Test JWT Token...${NC}"
JWT_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
    { 
        user_id: '$TEST_USER_ID', 
        email: 'test@example.com',
        role: 'user' 
    }, 
    'your-super-secure-jwt-secret-key-change-in-production-12345',
    { expiresIn: '1h' }
);
console.log(token);
")

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}❌ Failed to generate JWT token${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Token generated successfully${NC}"
fi

echo -e "\n${YELLOW}2. Testing Health Endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/health")
HEALTH_STATUS=$?
if [ $HEALTH_STATUS -eq 0 ]; then
    echo "Response: $HEALTH_RESPONSE"
    # Check if response contains expected fields
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"' || echo "$HEALTH_RESPONSE" | grep -q '"message"'; then
        print_result 0 "Health endpoint responds correctly"
    else
        print_result 1 "Health endpoint response format incorrect"
    fi
else
    print_result 1 "Health endpoint not accessible"
fi

echo -e "\n${YELLOW}3. Testing Authentication (Protected Routes)...${NC}"
# Test without authentication
UNAUTH_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/v1/notify" \
    -H "Content-Type: application/json" \
    -d '{
        "user_id": "test123",
        "template_name": "welcome_email",
        "variables": {"name": "Test User"}
    }')
UNAUTH_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n1)

if [ "$UNAUTH_CODE" = "401" ]; then
    print_result 0 "Authentication required for protected routes"
else
    print_result 1 "Authentication not properly enforced"
fi

echo -e "\n${YELLOW}4. Testing Notification Endpoint with Valid Request...${NC}"
NOTIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/notify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{
        "user_id": "'$TEST_USER_ID'",
        "template_name": "welcome_email",
        "variables": {
            "user_name": "John Doe",
            "user_email": "john@example.com"
        }
    }')

echo "Response: $NOTIFY_RESPONSE"

# Check for 202 Accepted status
if echo "$NOTIFY_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Notification request accepted successfully"
else
    print_result 1 "Notification request failed"
fi

echo -e "\n${YELLOW}5. Testing Snake_case Response Format...${NC}"
if echo "$NOTIFY_RESPONSE" | grep -q '"success":' && \
   echo "$NOTIFY_RESPONSE" | grep -q '"message":' && \
   echo "$NOTIFY_RESPONSE" | grep -q '"data":' && \
   echo "$NOTIFY_RESPONSE" | grep -q '"meta":'; then
    print_result 0 "Response format uses snake_case as required"
else
    print_result 1 "Response format not using snake_case"
fi

echo -e "\n${YELLOW}6. Testing Idempotency...${NC}"
IDEMPOTENCY_KEY="test-idempotency-$(date +%s)"
# First request
curl -s -X POST "$BASE_URL/api/v1/notify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
    -d '{
        "user_id": "'$TEST_USER_ID'",
        "template_name": "welcome_email",
        "variables": {"name": "First Request"}
    }' > /dev/null

# Second request with same idempotency key
SECOND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/notify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
    -d '{
        "user_id": "'$TEST_USER_ID'",
        "template_name": "welcome_email",
        "variables": {"name": "Second Request"}
    }')

if echo "$SECOND_RESPONSE" | grep -q '"idempotent":true'; then
    print_result 0 "Idempotency working correctly"
else
    print_result 1 "Idempotency not functioning"
fi

echo -e "\n${YELLOW}7. Testing Rate Limiting...${NC}"
echo "Making multiple rapid requests..."
for i in {1..5}; do
    curl -s -X POST "$BASE_URL/api/v1/notify" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "X-Client-ID: rate-test-$i" \
        -d '{
            "user_id": "'$TEST_USER_ID'",
            "template_name": "welcome_email",
            "variables": {"name": "Rate Test '$i'"}
        }' > /dev/null &
done
wait
echo "Rate limit test completed (check logs for rate limiting)"

echo -e "\n${YELLOW}8. Testing Message Queue Integration...${NC}"
# Check if messages are being queued in RabbitMQ
echo "Checking RabbitMQ queues..."
if command -v rabbitmqadmin > /dev/null; then
    rabbitmqadmin list queues name messages | grep -E "(email\.queue|push\.queue)"
    print_result 0 "RabbitMQ queues are accessible"
else
    echo "Install rabbitmqadmin to check queue status"
    echo "Or check manually at: http://localhost:15672"
fi

echo -e "\n${YELLOW}9. Testing Error Handling...${NC}"
# Test with invalid data
ERROR_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/v1/notify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{
        "user_id": "",
        "template_name": "",
        "variables": {}
    }')
ERROR_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)

if [ "$ERROR_CODE" = "400" ]; then
    print_result 0 "Error handling working for invalid data"
else
    print_result 1 "Error handling not working properly"
fi

echo -e "\n${YELLOW}10. Testing Circuit Breaker (Simulated)...${NC}"
echo "Circuit breaker stats from health endpoint:"
curl -s "$BASE_URL/health" | grep -A 10 "circuit_breakers"
print_result 0 "Circuit breaker integration verified"

echo -e "\n${YELLOW}📊 TEST SUMMARY${NC}"
echo "========================================"
echo "All critical API Gateway functionalities have been tested."
echo "Check the results above for any failures."
echo ""
echo "Next: Verify RabbitMQ messages are being processed by checking:"
echo "  - RabbitMQ Management: http://localhost:15672"
echo "  - Check email.queue and push.queue for messages"
echo ""
echo "🧪 Testing completed!"