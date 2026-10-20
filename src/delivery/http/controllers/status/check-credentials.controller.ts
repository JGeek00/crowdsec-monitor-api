import { Request, Response } from 'express';
import { toCanonicalTimestampFromDate } from '@/utils/timestamp-format';

export const checkCredentials = (_: Request, res: Response) => {
  res.json({
    message: 'Credentials are valid',
    timestamp: toCanonicalTimestampFromDate(new Date()),
  });
};
