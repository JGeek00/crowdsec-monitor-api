import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '@/utils/error-response';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json(errorResponse('Not found', 'Endpoint not found'));
};
