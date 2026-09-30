import { Request, Response } from 'express';
import { NotificationChannelsTable, GetChannelsResponse, ResponseWithError } from '@/models';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<GetChannelsResponse>;

export async function listChannels(_req: Request, res: Response<Res>): Promise<void> {
  try {
    const rows = await NotificationChannelsTable.findAll({ order: [['id', 'ASC']] });
    res.status(200).json({ data: rows.map((r) => r.get({ plain: true })) });
  } catch (err) {
    log.error('Error listing notification channels:', err);
    res
      .status(500)
      .json(errorResponse('Failed to list channels', err instanceof Error ? err.message : 'Unknown error'));
  }
}
