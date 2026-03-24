import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/error-response';

/**
 * Middleware to handle validation errors from express-validator
 * Returns 400 Bad Request with validation error details if validation fails
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json(errorResponse('Validation error', errors.array().map(err => err.msg).join(', ')));
    return;
  }
  
  next();
};
