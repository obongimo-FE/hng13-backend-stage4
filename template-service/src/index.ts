import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { formatSuccessResponse, formatErrorResponse } from './utils/response-formatter.js';


dotenv.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const isProduction = process.env.NODE_ENV === 'production';

const server: FastifyInstance = Fastify({ logger: true });

interface CreateTemplateRequest {
  Body: {
    name: string;
    content: string;
    version?: number;
    language?: string;
    type?: string;
    subject?: string;
    variables?: string[];
  };
}

interface GetTemplateParams {
  Params: {
    name: string;
  };
  Querystring: {
    version?: string;
    language?: string;
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
      name VARCHAR(100) NOT NULL,
      version INTEGER DEFAULT 1,
      language VARCHAR(10) DEFAULT 'en',
      type VARCHAR(20) DEFAULT 'email',
      subject VARCHAR(255),
      content TEXT NOT NULL,
      variables JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, version, language)
    );
    
    CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
    CREATE INDEX IF NOT EXISTS idx_templates_name_lang ON templates(name, language);
  `;
  try {
    await dbClient.query(query);
    server.log.info('Templates table checked/created successfully');
  } catch (err: any) {
    server.log.error('Error creating table:', err.message || err);  
  }
};

async function templateRoutes(server: FastifyInstance) {

  server.post<CreateTemplateRequest>('/templates', async (request, reply) => {
    const { 
      name, 
      content, 
      version = 1, 
      language = 'en', 
      type = 'email',
      subject,
      variables = []
    } = request.body;

    try {
      const query = `
        INSERT INTO templates (name, content, version, language, type, subject, variables) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING id AS template_id, name, version, language, type, subject, content, variables, created_at, updated_at
      `;
      const result = await dbClient.query(query, [
        name, 
        content, 
        version, 
        language, 
        type, 
        subject || null,
        JSON.stringify(variables)
      ]);

      reply.code(201); // 201 Created status code
      return formatSuccessResponse(
        result.rows[0],
        'Template created successfully'
      );
    } catch (err: any) {
      request.log.error(err);
      // Handle duplicate name error (Postgres error code 23505)
      if (err.code === '23505') {
          reply.code(409); // Conflict
          return formatErrorResponse('Template with this name already exists', 'duplicate_template');
      }
      reply.code(500);
      return formatErrorResponse('Internal Server Error', 'internal_error');
    }
  });

  server.get<GetTemplateParams>('/templates/:name', async (request, reply) => {
    const { name } = request.params;
    const { version, language = 'en' } = request.query;

    try {
      let query: string;
      let params: any[];
      
      if (version) {
        // Get specific version
        query = `
          SELECT id AS template_id, name, version, language, type, subject, content, variables, created_at, updated_at 
          FROM templates 
          WHERE name = $1 AND version = $2 AND language = $3
          ORDER BY version DESC
          LIMIT 1
        `;
        params = [name, parseInt(version as string), language];
      } else {
        // Get latest version for the language
        query = `
          SELECT id AS template_id, name, version, language, type, subject, content, variables, created_at, updated_at 
          FROM templates 
          WHERE name = $1 AND language = $2
          ORDER BY version DESC
          LIMIT 1
        `;
        params = [name, language];
      }
      
      const result = await dbClient.query(query, params);

      if (result.rows.length === 0) {
        reply.code(404); // Not Found
        return formatErrorResponse('Template not found', 'not_found');
      }

      const template = result.rows[0];
      // Parse JSONB fields
      if (template.variables && typeof template.variables === 'string') {
        template.variables = JSON.parse(template.variables);
      }

      return formatSuccessResponse(template, 'Template retrieved successfully');
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return formatErrorResponse('Internal Server Error', 'internal_error');
    }
  });
}

const start = async () => {
  try {
    // Connect to DB before starting server
    await dbClient.connect();
    server.log.info('Connected to Database!');
    await createTable();

    // Register all your routes with the prefix
    server.register(templateRoutes, { prefix: '/api/v1' });

    server.get('/health', async () => {
      return formatSuccessResponse(
        { status: 'ok', service: 'template-service' },
        'Service is healthy'
      );
    });

    await server.listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3001 });
    console.log(`Template Service running on port ${Number(process.env.PORT) || 3001}`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();