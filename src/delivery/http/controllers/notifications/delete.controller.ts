import { Request, Response } from 'express';
import type { NotificationIdParams, DeleteNotificationResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import { NotFoundError } from '@/domain/errors';

type Res = ResponseWithError<DeleteNotificationResponse>;

export async function deleteNotification(req: Request<NotificationIdParams>, res: Response<Res>): Promise<void> {
  try {
    await container.useCases.notifications.deleteNotification.execute(Number(req.params.id));
    res.status(200).json({ message: 'Notification deleted' });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Notification not found'));
      return;
    }
    log.error('Error deleting notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to delete notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
