import { Request, Response } from 'express';
import { GetNotificationHistoryResponse, ResponseWithError } from '@/models';
import { notificationHistoryService } from '@/services/notifications/notification-history.service';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<GetNotificationHistoryResponse>;

export async function getNotificationHistory(_req: Request, res: Response<Res>): Promise<void> {
  try {
    const data = notificationHistoryService.list();
    res.status(200).json({ data, total: data.length });
  } catch (err) {
    log.error('Error getting notification history:', err);
    res.status(500).json(errorResponse('Failed to get history', err instanceof Error ? err.message : 'Unknown error'));
  }
}
