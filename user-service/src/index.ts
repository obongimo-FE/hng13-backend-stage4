import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { createClient } from 'redis';
import { formatSuccessResponse, formatErrorResponse } from './utils/response-formatter.js';

dotenv.config();

const server: FastifyInstance = Fastify({ logger: true });
const isProduction = process.env.NODE_ENV === 'production';

interface CreateUserRequest {
  Body: {
    email: string;
    password: string;
    name: string;
    push_token?: string;
  };
}

interface GetUserParams {
  Params: {
    id: string;
  };
}

interface LoginRequest {
  Body: {
    email: string;
    password: string;
  };
}

// For the URL parameter /:id
interface UpdatePreferencesParams {
  Params: {
    id: string;
  };
}

// For the request body e.g. {"email": false}
interface UpdatePreferencesRequest {
  Body: {
    [key: string]: boolean; // Allows any boolean key like "email", "push", etc.
  };
}

// Create a new database client
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // Often needed for cloud DBs
});

// Create Redis client
let redisClient: ReturnType<typeof createClient>;

const createTable = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name VARCHAR(100),
        push_token TEXT,
        preferences JSONB DEFAULT '{"email": true, "push": true}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
      await dbClient.query(query);
      server.log.info('Users table checked/created successfully');
    } catch (err: any) {
      server.log.error('Error creating users table:', err.message || err);
    }
  };

async function userRoutes(server: FastifyInstance) {

  server.post<CreateUserRequest>('/users', async (request, reply) => {
    const { email, password, name, push_token } = request.body;

    try {
      // 1. Hash the password (salt rounds = 10 is standard)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 2. Insert into DB
      const query = `
        INSERT INTO users (email, password_hash, name, push_token)
        VALUES ($1, $2, $3, $4)
        RETURNING id AS user_id, email, name, preferences, created_at, push_token
      `;
      // NOTICE: We do NOT return the password_hash!
      const result = await dbClient.query(query, [email, passwordHash, name, push_token]);

      reply.code(201);
      return formatSuccessResponse(
        result.rows[0],
        'User created successfully'
      );
    } catch (err: any) {
      request.log.error(err);
      if (err.code === '23505') { // Unique violation (email already exists)
          reply.code(409);
          return formatErrorResponse('Email already registered', 'duplicate_email');
      }
      reply.code(500);
      return formatErrorResponse('Internal Server Error', 'internal_error');
    }
  });

  server.get<GetUserParams>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const cacheKey = `user:${id}`;

    // Ensure ID is an integer (basic validation to prevent ugly DB errors)
    if (isNaN(Number(id))) {
        reply.code(400);
        return formatErrorResponse('Invalid user ID', 'validation_error');
    }

    try {
      // 1. TRY CACHE FIRST
      const cachedUser = await redisClient.get(cacheKey);
      if (cachedUser) {
        request.log.info(`CACHE HIT: ${cacheKey}`);
        return formatSuccessResponse(JSON.parse(cachedUser), 'User retrieved successfully');
      }

      request.log.info(`CACHE MISS: ${cacheKey}`);
      
      // 2. IF MISS, QUERY DB
      // --- FIX: Added push_token to the query ---
      const query = `
        SELECT id AS user_id, email, name, preferences, created_at, push_token
        FROM users
        WHERE id = $1
      `;
      
      const result = await dbClient.query(query, [id]);

      if (result.rows.length === 0) {
        reply.code(404);
        return formatErrorResponse('User not found', 'not_found');
      }

      // --- FIX: Added this missing line ---
      const user = result.rows[0]; 

      // 3. SAVE TO CACHE (1 hour expiration)
      await redisClient.set(cacheKey, JSON.stringify(user), { EX: 3600 });

      return formatSuccessResponse(user, 'User retrieved successfully');
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return formatErrorResponse('Internal Server Error', 'internal_error');
    }
  });

  server.post<LoginRequest>('/login', async (request, reply) => {
  const { email, password } = request.body;

    try {
      // 1. Find the user by email
      const query = 'SELECT id AS user_id, email, name, preferences, push_token, created_at, password_hash FROM users WHERE email = $1';
      const result = await dbClient.query(query, [email]);

      if (result.rows.length === 0) {
        reply.code(401); // Unauthorized
        return formatErrorResponse('Invalid email or password', 'authentication_error');
      }

      const user = result.rows[0];

      // 2. Compare the hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        reply.code(401); // Unauthorized
        return formatErrorResponse('Invalid email or password', 'authentication_error');
      }

      // DO NOT return the password hash!
      const { password_hash, ...safeUserData } = user;

      // In a real app, you'd create a JWT token here.
      // For now, just logging in is enough.
      return formatSuccessResponse(safeUserData, 'Login successful');
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return formatErrorResponse('Internal Server Error', 'internal_error');
    }
  });

  server.patch<UpdatePreferencesParams & UpdatePreferencesRequest>(
    '/users/:id/preferences',
    async (request, reply) => {
      const { id } = request.params;
      const newPreferences = request.body;
      const cacheKey = `user:${id}`;

      if (isNaN(Number(id))) {
        reply.code(400);
        return formatErrorResponse('Invalid user ID', 'validation_error');
      }

      try {
        // This query is special:
        // 1. It finds the user by ID.
        // 2. 'preferences || $1' merges the existing JSONB preferences with the new JSON ($1)
        // 3. It returns the *newly updated* preferences.
        const query = `
          UPDATE users
          SET preferences = preferences || $1
          WHERE id = $2
          RETURNING id AS user_id, email, name, preferences;
        `;
        
        const result = await dbClient.query(query, [
          JSON.stringify(newPreferences), // $1 - The new preferences
          id                           // $2 - The user ID
        ]);

        if (result.rows.length === 0) {
          reply.code(404);
          return formatErrorResponse('User not found', 'not_found');
        }

        // --- CACHE INVALIDATION ---
        await redisClient.del(cacheKey);
        request.log.info(`CACHE INVALIDATED: ${cacheKey}`);

        return formatSuccessResponse(
          result.rows[0],
          'Preferences updated successfully'
        );

      } catch (err: any) {
        request.log.error(err);
        reply.code(500);
        return formatErrorResponse('Internal Server Error', 'internal_error');
      }
    }
  );
}

const start = async () => {
  try {
    // --- VALIDATE ENV VARIABLES ---
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      server.log.error('Missing Redis environment variable! (REDIS_URL)');
      process.exit(1); // Exit the app with an error
    }

    // --- CREATE CLIENT (Simplified URL Method) ---
    redisClient = createClient({
      url: redisUrl, // Use the full URL string
      // No socket/tls options needed for non-TLS connection
    });

    redisClient.on('error', (err) =>
      console.log('Redis Client Error', err)
    );

    // Connect to DB before starting server
    await dbClient.connect();
    server.log.info('Connected to Database!');
    await redisClient.connect();
    server.log.info('Connected to Redis!');

    // Setup database table
    await createTable();

    // Register all your routes with the prefix
    server.register(userRoutes, { prefix: '/api/v1' });

    server.get('/health', async () => {
      return formatSuccessResponse(
        { status: 'ok', service: 'user-service' },
        'Service is healthy'
      );
    });

    await server.listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3002 });
    console.log(`User Service running on port ${Number(process.env.PORT) || 3002}`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();