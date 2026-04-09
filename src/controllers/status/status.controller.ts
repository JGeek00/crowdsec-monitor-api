import { Request, Response } from 'express';
import { statusService } from '@/services';

export const getStatus = async (_: Request, res: Response) => {
  try {
    res.json(statusService.getStatusSnapshot());
  } catch (error) {
    res.status(500).send();
  }
};
