import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  log.error('Error:', err);

  res.status(500).json(errorResponse('Internal server error', err.message));
};
