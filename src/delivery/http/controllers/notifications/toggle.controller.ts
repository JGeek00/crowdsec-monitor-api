import { Request, Response } from 'express';
import type {
  NotificationIdParams,
  PostToggleNotificationBody,
  PutNotificationResponse,
  ResponseWithError,
} from '@/models';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/application/container';
import { NotFoundError } from '@/domain/errors';

type Res = ResponseWithError<PutNotificationResponse>;

export async function toggleNotification(
  req: Request<NotificationIdParams, Res, PostToggleNotificationBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const plain = await container.useCases.notifications.toggleNotification.execute(
      Number(req.params.id),
      req.body.enabled,
    );
    res.status(200).json({ data: plain } as never);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Notification not found'));
      return;
    }
    log.error('Error toggling notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to toggle notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
