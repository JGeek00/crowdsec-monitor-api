import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { config } from '../config';
import { errorResponse } from '../utils/error-response';

/**
 * Optional Bearer token authentication middleware
 * Only enforces authentication if API_PASSWORD is configured
 * 
 * Usage:
 * - If API_PASSWORD is not set: allows all requests
 * - If API_PASSWORD is set: requires "Authorization: Bearer <password>" header
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  // If API_PASSWORD is not configured, skip authentication
  if (!config.auth.apiPassword) {
    return next();
  }

  // Get Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json(errorResponse('Unauthorized', 'Authorization header is required'));
    return;
  }

  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json(errorResponse('Unauthorized', 'Authorization header must be in format: Bearer <token>'));
    return;
  }

  const token = parts[1];

  // Validate token using constant-time comparison to prevent timing oracle attacks
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(config.auth.apiPassword);
  if (
    tokenBuf.length !== secretBuf.length ||
    !timingSafeEqual(tokenBuf, secretBuf)
  ) {
    res.status(401).json(errorResponse('Unauthorized', 'Invalid credentials'));
    return;
  }

  // Authentication successful
  next();
};
