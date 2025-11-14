/**
 * Template Service API Documentation Routes
 * These are documentation-only routes for Swagger
 * Actual requests should be made to http://localhost:3001
 */
export default async function templateServiceRoutes(fastify, options) {
  // Documentation-only routes for Swagger UI
  
  fastify.get('/docs/template-service/templates/:name', {
    schema: {
      description: `
**Template Service Endpoint** (Port 3001)

Get template by name from Template Service.

**Base URL**: http://localhost:3001

**Full Endpoint**: \`GET http://localhost:3001/api/v1/templates/:name?version=1&language=en\`

**Query Parameters**:
- \`version\` (optional): Template version number
- \`language\` (optional): Template language (default: 'en')

**Authentication**: Not required
      `,
      tags: ['Template Service'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Template name' }
        },
        required: ['name']
      },
      querystring: {
        type: 'object',
        properties: {
          version: { type: 'string', description: 'Template version' },
          language: { type: 'string', description: 'Template language', default: 'en' }
        }
      },
      response: {
        200: {
          description: 'Template retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                template_id: { type: 'number' },
                name: { type: 'string' },
                version: { type: 'number' },
                language: { type: 'string' },
                type: { type: 'string', enum: ['email', 'push', 'both'] },
                subject: { type: 'string', nullable: true },
                content: { type: 'string' },
                variables: { type: 'array', items: { type: 'string' } },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              }
            },
            message: { type: 'string' },
            meta: { type: 'object' }
          }
        },
        404: {
          description: 'Template not found',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(200).send({
      message: 'This is documentation only. Use: GET http://localhost:3001/api/v1/templates/:name'
    });
  });

  fastify.post('/docs/template-service/templates', {
    schema: {
      description: `
**Template Service Endpoint** (Port 3001)

Create a new template.

**Base URL**: http://localhost:3001

**Full Endpoint**: \`POST http://localhost:3001/api/v1/templates\`

**Authentication**: Not required
      `,
      tags: ['Template Service'],
      body: {
        type: 'object',
        required: ['name', 'content'],
        properties: {
          name: { type: 'string', description: 'Template name (unique per version+language)' },
          content: { type: 'string', description: 'Template content with {{variables}}' },
          subject: { type: 'string', nullable: true, description: 'Email subject (for email templates)' },
          type: { type: 'string', enum: ['email', 'push', 'both'], default: 'email' },
          version: { type: 'number', default: 1, description: 'Template version' },
          language: { type: 'string', default: 'en', description: 'Template language' },
          variables: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'List of variable names used in template (e.g., ["user_name", "user_email"])'
          }
        }
      },
      response: {
        201: {
          description: 'Template created successfully',
          type: 'object'
        },
        409: {
          description: 'Template with this name already exists',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(200).send({
      message: 'This is documentation only. Use: POST http://localhost:3001/api/v1/templates'
    });
  });

  fastify.put('/docs/template-service/templates/:name', {
    schema: {
      description: `
**Template Service Endpoint** (Port 3001)

Update template (creates new version).

**Base URL**: http://localhost:3001

**Full Endpoint**: \`PUT http://localhost:3001/api/v1/templates/:name\`

**Note**: This endpoint creates a new version of the template. To update, POST a new template with incremented version.

**Authentication**: Not required
      `,
      tags: ['Template Service'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      body: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          subject: { type: 'string' },
          version: { type: 'number' },
          language: { type: 'string' },
          variables: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: {
          description: 'Template updated (new version created)',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(200).send({
      message: 'This is documentation only. To update, POST a new version: POST http://localhost:3001/api/v1/templates'
    });
  });

  fastify.delete('/docs/template-service/templates/:name', {
    schema: {
      description: `
**Template Service Endpoint** (Port 3001)

Delete template (if implemented).

**Base URL**: http://localhost:3001

**Full Endpoint**: \`DELETE http://localhost:3001/api/v1/templates/:name\`

**Note**: Currently not implemented. Templates are versioned and retained.

**Authentication**: Not required
      `,
      tags: ['Template Service'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      response: {
        200: {
          description: 'Template deleted (if implemented)',
          type: 'object'
        },
        501: {
          description: 'Not implemented',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(501).send({
      message: 'Delete endpoint not implemented. Templates are versioned and retained.'
    });
  });
}

