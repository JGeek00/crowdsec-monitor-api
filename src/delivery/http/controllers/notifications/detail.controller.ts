import { Request, Response } from 'express';
import type { NotificationIdParams, GetNotificationResponse, ResponseWithError } from '@/models';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';
import { container } from '@/application/container';
import { NotFoundError } from '@/domain/errors';

type Res = ResponseWithError<GetNotificationResponse>;

export async function getNotification(req: Request<NotificationIdParams>, res: Response<Res>): Promise<void> {
  try {
    const plain = await container.useCases.notifications.getNotification.execute(Number(req.params.id));
    res.status(200).json({ data: plain } as never);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Notification not found'));
      return;
    }
    log.error('Error getting notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to get notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
