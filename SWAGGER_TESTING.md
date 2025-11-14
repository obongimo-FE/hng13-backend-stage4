# Swagger Documentation Testing Guide

Complete guide for testing the API using Swagger UI.

## Access Swagger UI

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Open Swagger UI in your browser:**
   ```
   http://localhost:3000/docs
   ```

   You should see the Swagger interface with all available endpoints.

## Swagger UI Overview

The Swagger UI displays:
- **API Information**: System architecture, authentication, and service overview
- **All Service Endpoints**: Complete documentation for all services (API Gateway, User Service, Template Service)
- **All HTTP Methods**: GET, POST, PUT, PATCH, DELETE endpoints documented
- **Schemas**: Request/response models
- **Try it out**: Interactive testing for each endpoint

### Endpoint Organization

Swagger organizes endpoints by tags:
- **Health**: Health check endpoints
- **Notifications**: API Gateway notification endpoints
- **User Service**: All User Service endpoints (GET, POST, PATCH)
- **Template Service**: All Template Service endpoints (GET, POST, PUT, DELETE)

## Testing Endpoints

### 1. Health Check (No Authentication Required)

1. Find the **Health** section
2. Click on `GET /health`
3. Click **"Try it out"**
4. Click **"Execute"**
5. View the response in the **"Responses"** section

**Expected Response:**
```json
{
  "message": "API Gateway service is healthy",
  "circuit_breakers": {...},
  "dependencies": {...},
  "timestamp": "...",
  "uptime": ...
}
```

### 2. Test User Service Endpoints (Documentation)

The Swagger UI includes documentation for User Service endpoints. These are documented but accessed via port 3002:

1. **POST /api/v1/docs/user-service/users** - Create user (documentation)
2. **GET /api/v1/docs/user-service/users/:id** - Get user (documentation)
3. **POST /api/v1/docs/user-service/login** - Login (documentation)
4. **PATCH /api/v1/docs/user-service/users/:id/preferences** - Update preferences (documentation)

**Note**: These are documentation-only routes. To actually use them, make requests to:
- `POST http://localhost:3002/api/v1/users`
- `GET http://localhost:3002/api/v1/users/:id`
- `POST http://localhost:3002/api/v1/login`
- `PATCH http://localhost:3002/api/v1/users/:id/preferences`

### 3. Test Template Service Endpoints (Documentation)

The Swagger UI includes documentation for Template Service endpoints:

1. **POST /api/v1/docs/template-service/templates** - Create template (documentation)
2. **GET /api/v1/docs/template-service/templates/:name** - Get template (documentation)
3. **PUT /api/v1/docs/template-service/templates/:name** - Update template (documentation)
4. **DELETE /api/v1/docs/template-service/templates/:name** - Delete template (documentation - not implemented)

**Note**: These are documentation-only routes. To actually use them, make requests to:
- `POST http://localhost:3001/api/v1/templates`
- `GET http://localhost:3001/api/v1/templates/:name`
- `PUT http://localhost:3001/api/v1/templates/:name` (if implemented)
- `DELETE http://localhost:3001/api/v1/templates/:name` (not implemented)

### 4. Send Notification (Requires Authentication)

#### Step 1: Generate JWT Token

Before testing notification endpoints, you need a JWT token:

```bash
cd API-gateway-service
node src/scripts/generate-test-token.js
```

Copy the token that's printed (it's a long string starting with `eyJ...`).

#### Step 2: Authorize in Swagger

1. Scroll to the top of the Swagger UI
2. Click the **"Authorize"** button (lock icon) at the top right
3. In the **"bearerAuth"** field, paste your JWT token
4. Click **"Authorize"**
5. Click **"Close"**

You should now see a lock icon next to protected endpoints, indicating you're authenticated.

#### Step 3: Test Send Notification Endpoint

1. Find the **Notifications** section
2. Click on `POST /api/v1/notify`
3. Click **"Try it out"**
4. Fill in the request body:

```json
{
  "user_id": "1",
  "template_name": "welcome_email",
  "variables": {
    "user_name": "John Doe",
    "user_email": "john@example.com"
  }
}
```

5. **Important**: Add the `Idempotency-Key` header:
   - Scroll down to **"Parameters"**
   - Find **"Idempotency-Key"** (if available) or add it manually
   - Enter a unique value like: `swagger-test-123`

6. Click **"Execute"**

**Expected Response (202 Accepted):**
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

#### Step 5: Test Status Endpoint

1. Find `GET /api/v1/notifications/{correlation_id}/status`
2. Click **"Try it out"**
3. Enter the `correlation_id` from the previous response
4. Click **"Execute"**

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

## Complete Testing Workflow

### Prerequisites

Before testing, ensure you have:

1. **A user created:**
   ```bash
   curl -X POST http://localhost:3002/api/v1/users \
     -H "Content-Type: application/json" \
     -d '{
       "email": "swagger-test@example.com",
       "password": "password123",
       "name": "Swagger Test User",
       "push_token": "fcm-token-123"
     }'
   ```
   Note the `user_id` from the response.

2. **A template created:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/templates \
     -H "Content-Type: application/json" \
     -d '{
       "name": "swagger_test_template",
       "type": "email",
       "subject": "Test {{user_name}}",
       "content": "Hello {{user_name}}, this is a test!",
       "language": "en"
     }'
   ```

### Step-by-Step Swagger Testing

1. **Open Swagger UI**: http://localhost:3000/docs

2. **Authorize:**
   - Click **"Authorize"**
   - Generate token: `cd API-gateway-service && node src/scripts/generate-test-token.js`
   - Paste token in `bearerAuth` field
   - Click **"Authorize"** and **"Close"**

3. **Test Health Endpoint:**
   - `GET /health` → Click "Try it out" → "Execute"
   - Verify response shows healthy status

4. **Test Send Notification:**
   - `POST /api/v1/notify` → Click "Try it out"
   - Enter request body:
     ```json
     {
       "user_id": "1",
       "template_name": "swagger_test_template",
       "variables": {
         "user_name": "Swagger Test User",
         "user_email": "swagger-test@example.com"
       }
     }
     ```
   - Add `Idempotency-Key` header: `swagger-test-$(date +%s)`
   - Click **"Execute"**
   - Copy the `correlation_id` from response

5. **Test Status Endpoint:**
   - `GET /api/v1/notifications/{correlation_id}/status` → Click "Try it out"
   - Paste the `correlation_id` from step 4
   - Click **"Execute"**
   - Verify status shows "sent" or "processing"

6. **Verify Processing:**
   ```bash
   # Check email service logs
   docker-compose logs email-service --tail=10
   
   # Check push service logs (if push notification)
   docker-compose logs push-service --tail=10
   ```

## Testing Different Scenarios

### Test Email Notification

1. Use template with `"type": "email"`
2. Ensure user has `"email": true` in preferences
3. Send notification via Swagger
4. Check email service logs

### Test Push Notification

1. Use template with `"type": "push"`
2. Ensure user has `"push": true` in preferences and a `push_token`
3. Send notification via Swagger
4. Check push service logs

### Test Error Cases

#### Invalid Authentication
1. Click **"Authorize"**
2. Enter invalid token: `invalid-token`
3. Try to execute `POST /api/v1/notify`
4. Should return **401 Unauthorized**

#### Missing Required Fields
1. In `POST /api/v1/notify`, remove `template_name` from request body
2. Click **"Execute"**
3. Should return **400 Bad Request** with validation errors

#### Invalid User ID
1. Use `"user_id": "999"` (non-existent)
2. Click **"Execute"**
3. Should return **404 Not Found** or appropriate error

#### Invalid Template Name
1. Use `"template_name": "non_existent"`
2. Click **"Execute"**
3. Should return **404 Not Found** or appropriate error

## Swagger UI Features

### View Request/Response Schemas

- Click on any endpoint to see:
  - **Parameters**: Required/optional parameters
  - **Request Body**: Schema and example
  - **Responses**: All possible response codes and schemas

### Download OpenAPI Spec

1. Look for **"Download"** or **"JSON"** link at the top
2. Or access directly: http://localhost:3000/docs/json
3. Save the OpenAPI specification file

### View Model Definitions

- Scroll to the bottom of Swagger UI
- See all **Schemas** (data models) used in the API
- Includes request/response models

## Troubleshooting

### Swagger UI Not Loading

```bash
# Check if API Gateway is running
curl http://localhost:3000/health

# Check logs
docker-compose logs api-gateway --tail=20

# Restart API Gateway
docker-compose restart api-gateway
```

### Authentication Not Working

1. Verify token is valid:
   ```bash
   cd API-gateway-service
   node src/scripts/generate-test-token.js
   ```

2. Check token format in Swagger:
   - Should be just the token (without "Bearer " prefix)
   - Token should start with `eyJ`

3. Check API Gateway logs for auth errors:
   ```bash
   docker-compose logs api-gateway | grep -i auth
   ```

### Endpoints Not Appearing

1. Verify Swagger is properly configured:
   ```bash
   curl http://localhost:3000/docs/json | head -c 500
   ```

2. Check for errors in API Gateway logs:
   ```bash
   docker-compose logs api-gateway | grep -i swagger
   ```

### CORS Issues

If testing from a different origin, ensure CORS is configured in `API-gateway-service/src/app.js`.

## Quick Reference

### API Gateway (Port 3000)

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/health` | GET | No | Health check |
| `/api/v1/notify` | POST | Yes | Send notification |
| `/api/v1/notifications/{id}/status` | GET | Yes | Get notification status |

### User Service (Port 3002)

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/health` | GET | No | Health check |
| `/api/v1/users` | POST | No | Create user |
| `/api/v1/users/:id` | GET | No | Get user by ID |
| `/api/v1/login` | POST | No | User login |
| `/api/v1/users/:id/preferences` | PATCH | No | Update preferences |

### Template Service (Port 3001)

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/health` | GET | No | Health check |
| `/api/v1/templates` | POST | No | Create template |
| `/api/v1/templates/:name` | GET | No | Get template |
| `/api/v1/templates/:name` | PUT | No | Update template (documented, creates new version) |
| `/api/v1/templates/:name` | DELETE | No | Delete template (documented, not implemented) |

## Tips

1. **Save Token**: Copy your JWT token to a text file for easy reuse
2. **Use Unique Idempotency Keys**: Generate unique keys for each test
3. **Check Logs**: Always verify service logs after testing
4. **Test Edge Cases**: Use Swagger to test error scenarios
5. **Export Requests**: Use Swagger's "Copy cURL" feature to export requests

## Next Steps

After testing with Swagger:
- Review [TESTING.md](./TESTING.md) for comprehensive testing scenarios
- Check [README.md](./README.md) for API usage examples
- Verify all services are working correctly

