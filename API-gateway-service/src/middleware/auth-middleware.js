import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { formatErrorResponse } from '../utils/response-formatter.js';

export const authenticate = async (request, reply) => {
  // Skip authentication for health endpoint
  if (request.url === '/health') {
    return;
  }

  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return reply.code(401).send(
        formatErrorResponse(
          { code: 'missing_authorization_header' },
          'Authorization header is required'
        )
      );
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      return reply.code(401).send(
        formatErrorResponse(
          { code: 'invalid_authorization_format' },
          'Authorization header must be: Bearer <token>'
        )
      );
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.security.jwt_secret);
    request.user = decoded;
    
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return reply.code(401).send(
      formatErrorResponse(
        { code: 'invalid_token' },
        'Authentication token is invalid or expired'
      )
    );
  }
};