import jwt from 'jsonwebtoken';
import { ResponseFormatter } from '../utils/responseFormatter.js';

export class AuthMiddleware {
  static verifyToken(request, reply, done) {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return reply.code(401).send(
          ResponseFormatter.error(
            'missing_authorization_header',
            'Authorization header is required'
          )
        );
      }

      const [bearer, token] = authHeader.split(' ');

      if (bearer !== 'Bearer' || !token) {
        return reply.code(401).send(
          ResponseFormatter.error(
            'invalid_authorization_format', 
            'Authorization header must be: Bearer <token>'
          )
        );
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      request.user = decoded;
      
      done();
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return reply.code(401).send(
          ResponseFormatter.error(
            'token_expired',
            'Authentication token has expired'
          )
        );
      }
      
      return reply.code(401).send(
        ResponseFormatter.error(
          'invalid_token',
          'Authentication token is invalid'
        )
      );
    }
  }

  static requireApiKey(request, reply, done) {
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return reply.code(401).send(
        ResponseFormatter.error(
          'invalid_api_key',
          'Valid API key is required'
        )
      );
    }
    
    done();
  }
}