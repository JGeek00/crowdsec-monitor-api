import { Request, Response } from 'express';
import type { ChannelIdParams, DeleteChannelResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import { ConflictError, NotFoundError } from '@/domain/errors';

type Res = ResponseWithError<DeleteChannelResponse>;

export async function deleteChannel(req: Request<ChannelIdParams>, res: Response<Res>): Promise<void> {
  try {
    await container.useCases.notifications.deleteChannel.execute(Number(req.params.id));
    res.status(200).json({ message: 'Channel deleted' });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Channel not found'));
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json(errorResponse('Conflict', err.detail));
      return;
    }
    log.error('Error deleting notification channel:', err);
    res
      .status(500)
      .json(errorResponse('Failed to delete channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
