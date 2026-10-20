import { Request, Response } from 'express';
import type {
  ChannelIdParams,
  PostChannelTestBody,
  PostChannelTestResponse,
  ResponseWithError,
} from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import { NotFoundError } from '@/domain/errors';

type Res = ResponseWithError<PostChannelTestResponse>;

/** Send a test message through the channel. Result is returned, not stored in history. */
export async function testChannel(
  req: Request<ChannelIdParams, Res, PostChannelTestBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const result = await container.useCases.notifications.testChannel.execute(Number(req.params.id), req.body.message);
    res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Channel not found'));
      return;
    }
    log.error('Error testing notification channel:', err);
    res.status(500).json(errorResponse('Failed to test channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
