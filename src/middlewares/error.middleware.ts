import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/error-response';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  res.status(500).json(errorResponse('Internal server error', err.message));
};
