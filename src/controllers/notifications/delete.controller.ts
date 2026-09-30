import { Request, Response } from 'express';
import { NotificationsTable, NotificationIdParams, DeleteNotificationResponse, ResponseWithError } from '@/models';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<DeleteNotificationResponse>;

export async function deleteNotification(req: Request<NotificationIdParams>, res: Response<Res>): Promise<void> {
  try {
    const row = await NotificationsTable.findByPk(Number(req.params.id));
    if (!row) {
      res.status(404).json(errorResponse('Not found', 'Notification not found'));
      return;
    }
    const id = row.id;
    await row.destroy();
    notificationEngineService.removeFromCache(id);
    res.status(200).json({ message: 'Notification deleted' });
  } catch (err) {
    log.error('Error deleting notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to delete notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
