import { Request, Response } from 'express';
import { NotificationsTable, NotificationIdParams, GetNotificationResponse, ResponseWithError } from '@/models';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<GetNotificationResponse>;

export async function getNotification(req: Request<NotificationIdParams>, res: Response<Res>): Promise<void> {
  try {
    const row = await NotificationsTable.findByPk(Number(req.params.id));
    if (!row) {
      res.status(404).json(errorResponse('Not found', 'Notification not found'));
      return;
    }
    res.status(200).json({ data: row.get({ plain: true }) });
  } catch (err) {
    log.error('Error getting notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to get notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
