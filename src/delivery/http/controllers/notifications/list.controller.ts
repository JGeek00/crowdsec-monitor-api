import { Request, Response } from 'express';
import type { GetNotificationsResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';

type Res = ResponseWithError<GetNotificationsResponse>;

export async function listNotifications(_req: Request, res: Response<Res>): Promise<void> {
  try {
    const rows = await container.useCases.notifications.listNotifications.execute();
    res.status(200).json({ data: rows } as never);
  } catch (err) {
    log.error('Error listing notifications:', err);
    res
      .status(500)
      .json(errorResponse('Failed to list notifications', err instanceof Error ? err.message : 'Unknown error'));
  }
}
