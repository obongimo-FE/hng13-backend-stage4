# API Gateway Service

Entry point for the Distributed Notification System microservices architecture.

## Responsibilities:
- Authentication & validation of incoming requests
- Routing notifications to appropriate queues (email/push)
- Status tracking of notifications
- Health monitoring

## Tech Stack:
- Node.js + Fastify
- RabbitMQ for message queue
- JWT for authentication
- Docker for containerization