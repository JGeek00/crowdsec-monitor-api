import { Request, Response } from 'express';
import type { PostNotificationBody, PostNotificationResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import { ValidationError } from '@/domain/errors';

type Res = ResponseWithError<PostNotificationResponse>;

export async function createNotification(
  req: Request<object, Res, PostNotificationBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const plain = await container.useCases.notifications.createNotification.execute(req.body);
    res.status(201).json({ data: plain } as never);
  } catch (err) {
    if (err instanceof ValidationError) {
      const status = (err as ValidationError & { status?: number }).status === 422 ? 422 : 400;
      res.status(status).json(errorResponse(status === 422 ? 'Unprocessable entity' : 'Validation error', err.detail));
      return;
    }
    log.error('Error creating notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to create notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
