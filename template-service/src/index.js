import Fastify from 'fastify';
import dotenv from 'dotenv';
import { Client } from 'pg';


dotenv.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const server = Fastify({ logger: true });
const isProduction = process.env.NODE_ENV === 'production';

// Create a new database client
const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Often needed for cloud DBs
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
    }
    catch (err) {
        server.log.error('Error creating table:', err.message || err);
    }
};
async function templateRoutes(server) {
    server.post('/templates', async (request, reply) => {
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
        }
        catch (err) {
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
    server.get('/templates/:name', async (request, reply) => {
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
        }
        catch (err) {
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
        // Register all your routes with the prefix
        server.register(templateRoutes, { prefix: '/api/v1' });
        server.get('/health', async () => {
            return { status: 'ok', service: 'template-service' };
        });
        await server.listen({ port: Number(process.env.PORT) || 3001 });
        console.log(`Template Service running on port ${Number(process.env.PORT) || 3001}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map