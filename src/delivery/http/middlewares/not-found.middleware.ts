import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '@/delivery/http/error-response';

export const notFoundHandler = (_: Request, res: Response, __: NextFunction): void => {
  res.status(404).json(errorResponse('Not found', 'Endpoint not found'));
};
