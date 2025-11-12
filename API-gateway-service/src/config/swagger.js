import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification System API Gateway',
      version: '1.0.0',
      description: `
# Distributed Notification System - API Gateway

## Overview
The API Gateway serves as the single entry point for all notification requests in the distributed notification system. It handles authentication, validation, and intelligent routing of notifications to the appropriate queues for processing.

## Architecture
- **Microservices Pattern**: Each service has a single responsibility
- **Async Processing**: Fire-and-forget pattern with RabbitMQ
- **Circuit Breaker**: Resilient communication with external services
- **Rate Limiting**: Prevents abuse with Redis-based throttling

## Authentication
All endpoints (except health check) require JWT Bearer token authentication.

## Message Flow
1. Client sends notification request with JWT token
2. API Gateway validates and authenticates request
3. Request is routed to appropriate queue (email/push)
4. Immediate 202 Accepted response returned
5. Workers process messages asynchronously

## Rate Limiting
- **Limit**: 100 requests per minute per IP
- **Headers**: 
  - \`X-RateLimit-Limit\`: Maximum requests allowed
  - \`X-RateLimit-Remaining\`: Remaining requests
  - \`X-RateLimit-Reset\`: Reset timestamp

## Idempotency
Include \`Idempotency-Key\` header to prevent duplicate processing of the same request within 24 hours.
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Service health monitoring'
      },
      {
        name: 'Notifications',
        description: 'Notification management endpoints'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token in format: Bearer <token>'
        }
      },
      schemas: {
        // Health Response
        HealthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'API Gateway service is healthy'
            },
            circuit_breakers: {
              type: 'object',
              properties: {
                user_service: {
                  type: 'object',
                  properties: {
                    state: {
                      type: 'string',
                      enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
                      example: 'CLOSED'
                    },
                    stats: {
                      type: 'object',
                      properties: {
                        failures: { type: 'number', example: 0 },
                        successes: { type: 'number', example: 42 },
                        fires: { type: 'number', example: 42 }
                      }
                    }
                  }
                },
                template_service: {
                  type: 'object',
                  properties: {
                    state: {
                      type: 'string',
                      enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
                      example: 'CLOSED'
                    },
                    stats: {
                      type: 'object'
                    }
                  }
                }
              }
            },
            dependencies: {
              type: 'object',
              properties: {
                redis: {
                  type: 'string',
                  example: 'connected'
                },
                rabbitmq: {
                  type: 'string',
                  example: 'connected'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2023-11-11T17:42:25.247Z'
            },
            uptime: {
              type: 'number',
              example: 865.559
            }
          }
        },

        // Notification Request
        NotificationRequest: {
          type: 'object',
          required: ['user_id', 'template_name', 'variables'],
          properties: {
            user_id: {
              type: 'string',
              description: 'Unique identifier for the target user',
              example: 'user_123456'
            },
            template_name: {
              type: 'string',
              description: 'Name of the notification template to use',
              example: 'welcome_email'
            },
            variables: {
              type: 'object',
              description: 'Dynamic variables for template personalization',
              additionalProperties: true,
              example: {
                user_name: 'John Doe',
                user_email: 'john@example.com',
                activation_link: 'https://example.com/activate/123'
              }
            }
          }
        },

        // Success Response
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              nullable: true,
              properties: {
                notification_id: {
                  type: 'string',
                  example: 'a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2'
                },
                correlation_id: {
                  type: 'string',
                  example: 'a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2'
                },
                status: {
                  type: 'string',
                  example: 'queued'
                },
                queued_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2023-11-11T17:42:25.247Z'
                }
              }
            },
            message: {
              type: 'string',
              example: 'Notification request accepted and is being processed.'
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 1 },
                limit: { type: 'number', example: 1 },
                page: { type: 'number', example: 1 },
                total_pages: { type: 'number', example: 1 },
                has_next: { type: 'boolean', example: false },
                has_previous: { type: 'boolean', example: false }
              }
            }
          }
        },

        // Error Response
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'validation_error'
            },
            message: {
              type: 'string',
              example: 'user_id, template_name, and variables are required'
            }
          }
        },

        // Rate Limit Error
        RateLimitError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'rate_limit_exceeded'
            },
            message: {
              type: 'string',
              example: 'Too many requests. Please try again later.'
            }
          }
        }
      },
      responses: {
        // Common Responses
        Unauthorized: {
          description: 'Authentication required or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              examples: {
                missing_token: {
                  summary: 'Missing authorization header',
                  value: {
                    success: false,
                    error: 'missing_authorization_header',
                    message: 'Authorization header is required'
                  }
                },
                invalid_token: {
                  summary: 'Invalid JWT token',
                  value: {
                    success: false,
                    error: 'invalid_token',
                    message: 'Authentication token is invalid or expired'
                  }
                }
              }
            }
          }
        },
        RateLimitExceeded: {
          description: 'Too many requests',
          headers: {
            'X-RateLimit-Limit': {
              schema: { type: 'integer' },
              description: 'Maximum requests allowed per window'
            },
            'X-RateLimit-Remaining': {
              schema: { type: 'integer' },
              description: 'Remaining requests in current window'
            },
            'X-RateLimit-Reset': {
              schema: { type: 'integer' },
              description: 'Unix timestamp when rate limit resets'
            },
            'Retry-After': {
              schema: { type: 'integer' },
              description: 'Seconds to wait before retrying'
            }
          },
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitError'
              }
            }
          }
        },
        ValidationError: {
          description: 'Invalid request data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              examples: {
                missing_fields: {
                  summary: 'Missing required fields',
                  value: {
                    success: false,
                    error: 'validation_error',
                    message: 'user_id, template_name, and variables are required'
                  }
                }
              }
            }
          }
        }
      },
      parameters: {
        IdempotencyKey: {
          in: 'header',
          name: 'Idempotency-Key',
          schema: {
            type: 'string'
          },
          required: false,
          description: 'Unique key to prevent duplicate requests (valid for 24 hours)',
          example: 'unique-request-id-12345'
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);