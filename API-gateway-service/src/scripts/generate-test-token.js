import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Generate a test JWT token for development
const generateTestToken = () => {
  const payload = {
    user_id: 'test_user_123',
    email: 'developer@example.com',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  };

  return jwt.sign(payload, config.security.jwt_secret);
};

// Generate and display the token
const token = generateTestToken();

console.log(token);

// Export for use in tests
export { generateTestToken };