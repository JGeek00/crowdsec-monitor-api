import { Request, Response } from 'express';
import { toCanonicalTimestampFromDate } from '@/utils/timestamp-format';

export const healthCheck = (_: Request, res: Response) => {
  res.json({
    message: 'API is running',
    timestamp: toCanonicalTimestampFromDate(new Date()),
  });
};
