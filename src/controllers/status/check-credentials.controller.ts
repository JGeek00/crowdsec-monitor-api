import { Request, Response } from 'express';

export const checkCredentials = (_: Request, res: Response) => {
  res.json({
    message: 'Credentials are valid',
    timestamp: new Date().toISOString(),
  });
};
