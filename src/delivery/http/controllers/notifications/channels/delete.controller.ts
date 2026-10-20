import { Request, Response } from 'express';
import { ChannelIdParams, DeleteChannelResponse, ResponseWithError } from '@/delivery/http/contracts';
import { NotificationChannelsTable } from '@/delivery/http/contracts';
import { notificationEngineService } from '@/infrastructure/notifications/engine';
import { findNotificationsUsingChannel } from '@/application/use-cases/notifications/channel-refs';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';
import { log } from '@/infrastructure/system/logger';

type Res = ResponseWithError<DeleteChannelResponse>;

export async function deleteChannel(req: Request<ChannelIdParams>, res: Response<Res>): Promise<void> {
  try {
    const row = await NotificationChannelsTable.findByPk(Number(req.params.id));
    if (!row) {
      res.status(404).json(errorResponse('Not found', 'Channel not found'));
      return;
    }
    const usedBy = await findNotificationsUsingChannel(container.repositories.notificationRepository, row.id);
    if (usedBy.length > 0) {
      res
        .status(409)
        .json(
          errorResponse(
            'Conflict',
            `Channel is used by notification(s) ${usedBy.join(', ')}. Remove it from them before deleting.`,
          ),
        );
      return;
    }
    const id = row.id;
    await row.destroy();
    notificationEngineService.removeChannelCache(id);
    res.status(200).json({ message: 'Channel deleted' });
  } catch (err) {
    log.error('Error deleting notification channel:', err);
    res
      .status(500)
      .json(errorResponse('Failed to delete channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
