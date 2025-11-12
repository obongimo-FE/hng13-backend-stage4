/**
 * Swagger configuration for Fastify v5
 */
export const swaggerOptions = {
  swagger: {
    info: {
      title: 'Notification System API Gateway',
      description: `
# Distributed Notification System - API Gateway

## Overview
The API Gateway serves as the single entry point for all notification requests.

## Features
- JWT Authentication
- Rate Limiting (100 requests/minute)
- Intelligent Routing (Email vs Push)
- Circuit Breaker Pattern
- Async Processing with RabbitMQ

## Authentication
All endpoints (except health check) require JWT Bearer token.

## Message Flow
1. Client sends notification request with JWT token
2. API Gateway validates and routes to appropriate queue
3. Immediate 202 Accepted response returned
4. Workers process messages asynchronously
      `,
      version: '1.0.0'
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    security: [
      {
        bearerAuth: []
      }
    ],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Enter: Bearer <jwt-token>'
      }
    }
  }
};

export const swaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'none',
    deepLinking: false
  },
  theme: {
    title: 'Notification System API Gateway'
  }
};