import { createClient } from 'redis';
import { config } from '../config/env.js';

let redisClient = null;

export const connectRedis = async () => {
  try {
    console.log('Connecting to Redis...');
    
    redisClient = createClient({
      url: config.redis.url
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    await redisClient.connect();
    
    // Test connection
    await redisClient.set('api-gateway:health-check', 'connected');
    
    console.log('Redis connection test passed');
    
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not connected');
  }
  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('✅ Redis connection closed');
  }
};

// API Gateway specific Redis functions
export const checkIdempotencyKey = async (key) => {
  const client = getRedisClient();
  return await client.exists(key);
};

export const setIdempotencyKey = async (key, value, ttl = 86400) => {
  const client = getRedisClient();
  await client.set(key, JSON.stringify(value), { EX: ttl });
};

export const getIdempotencyValue = async (key) => {
  const client = getRedisClient();
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
};