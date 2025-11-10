import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config();

const server: FastifyInstance = Fastify({ logger: true });

interface CreateUserRequest {
  Body: {
    email: string;
    password: string;
    name: string;
  };
}

interface GetUserParams {
  Params: {
    id: string;
  };
}

// Create a new database client
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Often needed for cloud DBs
});

server.get('/health', async () => {
  return { status: 'ok', service: 'user-service' };
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name VARCHAR(100),
      preferences JSONB DEFAULT '{"email": true, "push": true}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await dbClient.query(query);
    server.log.info('Users table checked/created successfully');
  } catch (err) {
    server.log.error('Error creating users table:', err);
  }
};

server.post<CreateUserRequest>('/users', async (request, reply) => {
  const { email, password, name } = request.body;

  try {
    // 1. Hash the password (salt rounds = 10 is standard)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Insert into DB
    const query = `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, preferences, created_at
    `;
    // NOTICE: We do NOT return the password_hash!
    const result = await dbClient.query(query, [email, passwordHash, name]);

    reply.code(201);
    return {
      success: true,
      message: 'User created successfully',
      data: result.rows[0]
    };
  } catch (err: any) {
    request.log.error(err);
    if (err.code === '23505') { // Unique violation (email already exists)
         reply.code(409);
         return { success: false, message: 'Email already registered' };
    }
    reply.code(500);
    return { success: false, message: 'Internal Server Error' };
  }
});

server.get<GetUserParams>('/users/:id', async (request, reply) => {
  const { id } = request.params;

  try {
    // Select only safe fields!
    const query = `
      SELECT id, email, name, preferences, created_at
      FROM users
      WHERE id = $1
    `;
    // Ensure ID is an integer (basic validation to prevent ugly DB errors)
    if (isNaN(Number(id))) {
        reply.code(400);
        return { success: false, message: 'Invalid user ID' };
    }

    const result = await dbClient.query(query, [id]);

    if (result.rows.length === 0) {
      reply.code(404);
      return { success: false, message: 'User not found' };
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

const start = async () => {
  try {
    // Connect to DB before starting server
    await dbClient.connect();
    server.log.info('Connected to Database!');

    await createTable();

    await server.listen({ port: process.env.PORT || 3002 });
    console.log(`User Service running on port ${Number(process.env.PORT) || 3002}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();