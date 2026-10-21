import { Request, Response } from 'express';
import type { PostChannelTestInlineBody, PostChannelTestResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import { ValidationError } from '@/domain/errors';

type Res = ResponseWithError<PostChannelTestResponse>;

/** Test an unsaved channel config. Result is returned, not stored in history. */
export async function testInlineChannel(
  req: Request<object, Res, PostChannelTestInlineBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const result = await container.useCases.notifications.testInlineChannel.execute(req.body);
    res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json(errorResponse('Validation error', err.detail));
      return;
    }
    log.error('Error testing inline channel:', err);
    res.status(500).json(errorResponse('Failed to test channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
