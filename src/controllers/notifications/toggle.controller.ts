import { Request, Response } from 'express';
import {
  NotificationsTable,
  NotificationIdParams,
  PostToggleNotificationBody,
  PutNotificationResponse,
  ResponseWithError,
} from '@/models';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<PutNotificationResponse>;

export async function toggleNotification(
  req: Request<NotificationIdParams, Res, PostToggleNotificationBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const row = await NotificationsTable.findByPk(Number(req.params.id));
    if (!row) {
      res.status(404).json(errorResponse('Not found', 'Notification not found'));
      return;
    }
    await row.update({ enabled: req.body.enabled, updated_at: new Date() });
    const plain = row.get({ plain: true });
    notificationEngineService.upsertCache(plain);
    res.status(200).json({ data: plain });
  } catch (err) {
    log.error('Error toggling notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to toggle notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
