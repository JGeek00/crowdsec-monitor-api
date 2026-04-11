import { Request, Response, NextFunction } from 'express';
import { IncomingMessage } from 'http';
import { timingSafeEqual } from 'crypto';
import { config } from '@/config';
import { errorResponse } from '@/utils/error-response';

/**
 * Validates the Bearer token from an IncomingMessage's Authorization header.
 * Returns true if authentication is not required or the token is valid.
 */
export const isAuthorized = (req: IncomingMessage): boolean => {
  if (!config.auth.apiPassword) return true;

  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return false;

  const tokenBuf = Buffer.from(parts[1]);
  const secretBuf = Buffer.from(config.auth.apiPassword);
  return tokenBuf.length === secretBuf.length && timingSafeEqual(tokenBuf, secretBuf);
};

/**
 * Optional Bearer token authentication middleware
 * Only enforces authentication if API_PASSWORD is configured
 * 
 * Usage:
 * - If API_PASSWORD is not set: allows all requests
 * - If API_PASSWORD is set: requires "Authorization: Bearer <password>" header
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (isAuthorized(req)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json(errorResponse('Unauthorized', 'Authorization header is required'));
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json(errorResponse('Unauthorized', 'Authorization header must be in format: Bearer <token>'));
    return;
  }

  res.status(401).json(errorResponse('Unauthorized', 'Invalid credentials'));
};
