import { Request, Response } from 'express';
import { ChannelIdParams, GetChannelResponse, ResponseWithError } from '@/models';
import { NotificationChannelsTable } from '@/models';
import { errorResponse } from '@/utils/error-response';
import { toChannelResponse } from '@/helpers/notifications/channel-response.helper';
import { log } from '@/services/log.service';

type Res = ResponseWithError<GetChannelResponse>;

export async function getChannel(req: Request<ChannelIdParams>, res: Response<Res>): Promise<void> {
  try {
    const row = await NotificationChannelsTable.findByPk(Number(req.params.id));
    if (!row) {
      res.status(404).json(errorResponse('Not found', 'Channel not found'));
      return;
    }
    res.status(200).json({ data: toChannelResponse(row.get({ plain: true })) });
  } catch (err) {
    log.error('Error getting notification channel:', err);
    res.status(500).json(errorResponse('Failed to get channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
