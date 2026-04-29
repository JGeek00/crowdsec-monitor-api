import { Request, Response, NextFunction } from 'express';
import { IncomingMessage } from 'http';
import { timingSafeEqual } from 'crypto';
import { config } from '@/config';
import { errorResponse } from '@/utils/error-response';

export interface AuthResult {
  isValid: boolean;
  message?: string;
  statusCode?: number;
}

export class AuthMiddleware {
  /**
   * EXPRESS AUTH HANDLER
   * 
   * Express middleware that responds with JSON.
   * Uses checkAuth() for authentication logic.
   * 
   * @param req - Express Request
   * @param res - Express Response
   * @param next - Express NextFunction
   */
  static expressAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const result = this.checkAuth(authHeader);

    if (result.isValid) {
      return next();
    }

    res.status(result.statusCode || 401).json(errorResponse('Unauthorized', result.message || 'Invalid credentials'));
  };

  /**
   * WEBSOCKET AUTH HANDLER
   * 
   * WebSocket handler that sends HTTP 401 response.
   * Uses checkAuth() for authentication logic.
   * 
   * @param req - IncomingMessage from WebSocket request
   * @param socket - WebSocket socket (Duplex type from Express 5)
   * @param head - Header buffer
   */
  static wsAuth = (req: IncomingMessage, socket: any, head: Buffer): void => {
    const authHeader = req.headers.authorization;
    const result = this.checkAuth(authHeader);

    if (result.isValid) {
      return;
    }

    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
  };


  /**
   * AUTHENTICATION LOGIC
   * 
   * This function contains all the token validation logic.
   * It is called by both Express and WebSocket handlers.
   * 
   * @param authHeader - The Authorization header from the request
   * @returns AuthResult with the authentication result
   */
  private static checkAuth = (authHeader: string | undefined): AuthResult => {
    if (!config.auth.apiPassword) {
      return { isValid: true };
    }

    if (!authHeader) {
      return {
        isValid: false,
        message: 'Authorization header is required',
        statusCode: 401
      };
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return {
        isValid: false,
        message: 'Authorization header must be in format: Bearer <token>',
        statusCode: 401
      };
    }

    const tokenBuf = Buffer.from(parts[1]);
    const secretBuf = Buffer.from(config.auth.apiPassword);

    if (tokenBuf.length !== secretBuf.length) {
      return {
        isValid: false,
        message: 'Invalid credentials',
        statusCode: 401
      };
    }

    const isValid = timingSafeEqual(tokenBuf, secretBuf);

    return {
      isValid,
      message: !isValid ? 'Invalid credentials' : undefined,
      statusCode: !isValid ? 401 : undefined
    };
  };
}