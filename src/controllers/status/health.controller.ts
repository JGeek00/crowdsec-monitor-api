import { Request, Response } from 'express';

export const healthCheck = (req: Request, res: Response) => {
  res.json({
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
};
