import { Request, Response } from 'express';
import type { ChannelIdParams, GetChannelResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { toChannelResponse } from '@/delivery/http/presenters/notifications/channel-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import { NotFoundError } from '@/domain/errors';

type Res = ResponseWithError<GetChannelResponse>;

export async function getChannel(req: Request<ChannelIdParams>, res: Response<Res>): Promise<void> {
  try {
    const channel = await container.useCases.notifications.getChannel.execute(Number(req.params.id));
    res.status(200).json({ data: toChannelResponse(channel) });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Channel not found'));
      return;
    }
    log.error('Error getting notification channel:', err);
    res.status(500).json(errorResponse('Failed to get channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
