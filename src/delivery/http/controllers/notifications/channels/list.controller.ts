import { Request, Response } from 'express';
import type { GetChannelsResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { toChannelResponse } from '@/delivery/http/presenters/notifications/channel-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';

type Res = ResponseWithError<GetChannelsResponse>;

export async function listChannels(_req: Request, res: Response<Res>): Promise<void> {
  try {
    const rows = await container.useCases.notifications.listChannels.execute();
    res.status(200).json({ data: rows.map((r) => toChannelResponse(r)) });
  } catch (err) {
    log.error('Error listing notification channels:', err);
    res
      .status(500)
      .json(errorResponse('Failed to list channels', err instanceof Error ? err.message : 'Unknown error'));
  }
}
