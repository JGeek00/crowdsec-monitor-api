import { Request, Response } from 'express';
import type { PutChannelBody, PutChannelResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { toChannelResponse } from '@/delivery/http/presenters/notifications/channel-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import { NotFoundError, ValidationError } from '@/domain/errors';

type Res = ResponseWithError<PutChannelResponse>;

export async function updateChannel(
  req: Request<{ id: string }, Res, PutChannelBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const channel = await container.useCases.notifications.updateChannel.execute(Number(req.params.id), req.body);
    res.status(200).json({ data: toChannelResponse(channel) });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Channel not found'));
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json(errorResponse('Validation error', err.detail));
      return;
    }
    log.error('Error updating notification channel:', err);
    res
      .status(500)
      .json(errorResponse('Failed to update channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
