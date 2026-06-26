import { Request, Response } from 'express';
import { statusService } from '@/services';
import { StatusSnapshot } from '@/models';

export const getStatus = async (_: Request, res: Response<StatusSnapshot>) => {
  try {
    res.json(statusService.getCleanSnapshot());
  } catch {
    res.status(500).send();
  }
};
