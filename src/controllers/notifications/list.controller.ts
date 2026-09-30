import { Request, Response } from 'express';
import { NotificationsTable, GetNotificationsResponse, ResponseWithError } from '@/models';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<GetNotificationsResponse>;

export async function listNotifications(_req: Request, res: Response<Res>): Promise<void> {
  try {
    const rows = await NotificationsTable.findAll({ order: [['id', 'ASC']] });
    res.status(200).json({ data: rows.map((r) => r.get({ plain: true })) });
  } catch (err) {
    log.error('Error listing notifications:', err);
    res
      .status(500)
      .json(errorResponse('Failed to list notifications', err instanceof Error ? err.message : 'Unknown error'));
  }
}
