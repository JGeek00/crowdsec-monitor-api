import { Request, Response } from 'express';
import type { PostChannelBody, PostChannelResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { toChannelResponse } from '@/delivery/http/presenters/notifications/channel-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import { ValidationError } from '@/domain/errors';

type Res = ResponseWithError<PostChannelResponse>;

export async function createChannel(req: Request<object, Res, PostChannelBody>, res: Response<Res>): Promise<void> {
  try {
    const channel = await container.useCases.notifications.createChannel.execute(req.body);
    res.status(201).json({ data: toChannelResponse(channel) });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json(errorResponse('Validation error', err.detail));
      return;
    }
    log.error('Error creating notification channel:', err);
    res
      .status(500)
      .json(errorResponse('Failed to create channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
