import { Request, Response } from 'express';
import type { NotificationIdParams, PutNotificationBody, PutNotificationResponse, ResponseWithError } from '@/models';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/application/container';
import { ValidationError, NotFoundError } from '@/domain/errors';

type Res = ResponseWithError<PutNotificationResponse>;

export async function updateNotification(
  req: Request<NotificationIdParams, Res, PutNotificationBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const plain = await container.useCases.notifications.updateNotification.execute(
      Number(req.params.id),
      req.body as unknown as Record<string, unknown>,
    );
    res.status(200).json({ data: plain } as never);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Notification not found'));
      return;
    }
    if (err instanceof ValidationError) {
      const status = (err as ValidationError & { status?: number }).status === 422 ? 422 : 400;
      res.status(status).json(errorResponse(status === 422 ? 'Unprocessable entity' : 'Validation error', err.detail));
      return;
    }
    log.error('Error updating notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to update notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
