import { Request, Response } from 'express';
import { StatusSnapshot } from '@/models';
import { container } from '@/container';

export const getStatus = async (_: Request, res: Response<StatusSnapshot>) => {
  try {
    res.json(await container.useCases.status.getStatus.execute());
  } catch {
    res.status(500).send();
  }
};
