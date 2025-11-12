import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { Client } from 'pg';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';


dotenv.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const isProduction = process.env.NODE_ENV === 'production';

const server: FastifyInstance = Fastify({ logger: true });

interface CreateTemplateRequest {
  Body: {
    name: string;
    content: string;
  };
}

interface GetTemplateParams {
  Params: {
    name: string;
  };
}

interface UpdateTemplateParams {
  Params: {
    name: string;
  };
}

interface UpdateTemplateRequest {
  Body: {
    content: string; // Only allowing content updates
  };
}

// Create a new database client
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // Often needed for cloud DBs
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await dbClient.query(query);
    server.log.info('Templates table checked/created successfully');
  } catch (err: any) {
    server.log.error('Error creating table:', err.message || err);  
  }
};

async function templateRoutes(server: FastifyInstance) {

  server.post<CreateTemplateRequest>('/templates', {
    // --- ADDING SCHEMA ---
    schema: {
      summary: 'Create a new template',
      tags: ['Templates'],
      body: {
        type: 'object',
        required: ['name', 'content'],
        properties: {
          name: { type: 'string' },
          content: { type: 'string' }
        }
      },
      response: {
        201: {
          description: 'Template created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { $ref: 'Template' } // Use our shared schema
          }
        },
        409: {
          description: 'Template name already exists',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { name, content } = request.body;

    try {
      const query = 'INSERT INTO templates (name, content) VALUES ($1, $2) RETURNING id AS template_id, name, content, created_at';
      const result = await dbClient.query(query, [name, content]);

      reply.code(201); // 201 Created status code
      return {
        success: true,
        message: 'Template created successfully',
        data: result.rows[0]
      };
    } catch (err: any) {
      request.log.error(err);
      // Handle duplicate name error (Postgres error code 23505)
      if (err.code === '23505') {
          reply.code(409); // Conflict
          return { success: false, message: 'Template with this name already exists' };
      }
      reply.code(500);
      return { success: false, message: 'Internal Server Error' };
    }
  });

  server.get<GetTemplateParams>('/templates/:name', {
    // --- ADDING SCHEMA ---
    schema: {
      summary: 'Get a template by its name',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { $ref: 'Template' } // Use our shared schema
          }
        },
        404: {
          description: 'Template not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.params;

    try {
      const query = 'SELECT id AS template_id, name, content, created_at FROM templates WHERE name = $1';
      const result = await dbClient.query(query, [name]);

      if (result.rows.length === 0) {
        reply.code(404); // Not Found
        return { success: false, message: 'Template not found' };
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { success: false, message: 'Internal Server Error' };
    }
  });

  server.patch<UpdateTemplateParams & UpdateTemplateRequest>('/templates/:name', {
    schema: {
      summary: 'Update a template\'s content',
      tags: ['Templates'],
      params: {
        type: 'object',
        properties: { name: { type: 'string' } }
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: { content: { type: 'string' } }
      },
      response: {
        200: { $ref: 'Template' } // Returns the updated template
      }
    }
  }, async (request, reply) => {
    const { name } = request.params;
    const { content } = request.body;

    try {
      const query = `
        UPDATE templates
        SET content = $1
        WHERE name = $2
        RETURNING id AS template_id, name, content, created_at;
      `;
      const result = await dbClient.query(query, [content, name]);

      if (result.rows.length === 0) {
        reply.code(404);
        return { success: false, message: 'Template not found' };
      }

      return { success: true, data: result.rows[0] };
    } catch (err: any) {
      request.log.error(err);
      reply.code(500);
      return { success: false, message: 'Internal Server Error' };
    }
  });

  server.delete<GetTemplateParams>('/templates/:name', {
    schema: {
      summary: 'Delete a template by name',
      tags: ['Templates'],
      params: {
        type: 'object',
        properties: { name: { type: 'string' } }
      },
      response: {
        204: { // 204 means "No Content" (a successful deletion)
          type: 'object',
          properties: {}
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.params;

    try {
      const query = 'DELETE FROM templates WHERE name = $1 RETURNING *;';
      const result = await dbClient.query(query, [name]);

      if (result.rows.length === 0) {
        reply.code(404);
        return { success: false, message: 'Template not found' };
      }

      reply.code(204); // Send "No Content"
      return; // Return nothing
    } catch (err: any) {
      request.log.error(err);
      reply.code(500);
      return { success: false, message: 'Internal Server Error' };
    }
  });
}

const start = async () => {
  try {
    // Connect to DB before starting server
    await dbClient.connect();
    server.log.info('Connected to Database!');
    await createTable();

    // Register the main Swagger plugin
    await server.register(fastifySwagger, { 
      openapi: {
        info: {
          title: 'HNG Template Service',
          description: 'API documentation for the Template services',
          version: '1.0.0'
        },
        servers: [
          { url: 'http://localhost:3001', description: 'Development server' }
        ],
      },
    });
    
    // Register the Swagger UI (the webpage)
    await server.register(fastifySwaggerUI, { 
      routePrefix: '/docs', // This creates the http://localhost:3001/docs page
      uiConfig: {
        docExpansion: 'full', // 'list' or 'full'
        deepLinking: false
      },
      staticCSP: true, // Content Security Policy
      transformStaticCSP: (header) => header,
    });
    
    // Define User schema for Swagger
    const templateSchema = {
      $id: 'Template',
      type: 'object',
      properties: {
        template_id: { type: 'number' },
        name: { type: 'string' },
        content: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
      }
    };

    server.addSchema(templateSchema);

    // Register all your routes with the prefix
    server.register(templateRoutes, { prefix: '/api/v1' });

    server.get('/health', async () => {
    return { status: 'ok', service: 'template-service' };
    });

    await server.listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3001 });
    console.log(`Template Service running on port ${Number(process.env.PORT) || 3001}`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();