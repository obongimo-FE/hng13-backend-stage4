/**
 * User Service API Documentation Routes
 * These are documentation-only routes for Swagger
 * Actual requests should be made to http://localhost:3002
 */
export default async function userServiceRoutes(fastify, options) {
  // Documentation-only routes for Swagger UI
  // These help document the User Service API
  
  fastify.get('/docs/user-service/users/:id', {
    schema: {
      description: `
**User Service Endpoint** (Port 3002)

Get user by ID from User Service.

**Base URL**: http://localhost:3002

**Full Endpoint**: \`GET http://localhost:3002/api/v1/users/:id\`

**Authentication**: Not required

**Response**: Returns user data with preferences and push_token
      `,
      tags: ['User Service'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' }
        },
        required: ['id']
      },
      response: {
        200: {
          description: 'User retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user_id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string' },
                preferences: {
                  type: 'object',
                  properties: {
                    email: { type: 'boolean' },
                    push: { type: 'boolean' }
                  }
                },
                push_token: { type: 'string', nullable: true },
                created_at: { type: 'string', format: 'date-time' }
              }
            },
            message: { type: 'string' },
            meta: { type: 'object' }
          }
        },
        404: {
          description: 'User not found',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(200).send({
      message: 'This is documentation only. Use: GET http://localhost:3002/api/v1/users/:id'
    });
  });

  fastify.post('/docs/user-service/users', {
    schema: {
      description: `
**User Service Endpoint** (Port 3002)

Create a new user.

**Base URL**: http://localhost:3002

**Full Endpoint**: \`POST http://localhost:3002/api/v1/users\`

**Authentication**: Not required
      `,
      tags: ['User Service'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
          push_token: { type: 'string', nullable: true }
        }
      },
      response: {
        201: {
          description: 'User created successfully',
          type: 'object'
        },
        409: {
          description: 'Email already exists',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(200).send({
      message: 'This is documentation only. Use: POST http://localhost:3002/api/v1/users'
    });
  });

  fastify.post('/docs/user-service/login', {
    schema: {
      description: `
**User Service Endpoint** (Port 3002)

User login/authentication.

**Base URL**: http://localhost:3002

**Full Endpoint**: \`POST http://localhost:3002/api/v1/login\`

**Authentication**: Not required
      `,
      tags: ['User Service'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Login successful',
          type: 'object'
        },
        401: {
          description: 'Invalid credentials',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(200).send({
      message: 'This is documentation only. Use: POST http://localhost:3002/api/v1/login'
    });
  });

  fastify.patch('/docs/user-service/users/:id/preferences', {
    schema: {
      description: `
**User Service Endpoint** (Port 3002)

Update user notification preferences.

**Base URL**: http://localhost:3002

**Full Endpoint**: \`PATCH http://localhost:3002/api/v1/users/:id/preferences\`

**Authentication**: Not required
      `,
      tags: ['User Service'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'boolean' },
          push: { type: 'boolean' }
        }
      },
      response: {
        200: {
          description: 'Preferences updated successfully',
          type: 'object'
        },
        404: {
          description: 'User not found',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(200).send({
      message: 'This is documentation only. Use: PATCH http://localhost:3002/api/v1/users/:id/preferences'
    });
  });
}

