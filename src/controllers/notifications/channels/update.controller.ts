import { Request, Response } from 'express';
import { ChannelIdParams, PutChannelBody, PutChannelResponse, ResponseWithError } from '@/models';
import { NotificationChannelsTable } from '@/models';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { validateChannelConfig } from '@/utils/notification-channel';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<PutChannelResponse>;

export async function updateChannel(
  req: Request<ChannelIdParams, Res, PutChannelBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const row = await NotificationChannelsTable.findByPk(Number(req.params.id));
    if (!row) {
      res.status(404).json(errorResponse('Not found', 'Channel not found'));
      return;
    }
    const nextType = req.body.type ?? row.type;
    const nextConfig = req.body.config ?? row.config;
    if (req.body.type !== undefined || req.body.config !== undefined) {
      const errors = validateChannelConfig(nextType, nextConfig);
      if (errors.length > 0) {
        res.status(400).json(errorResponse('Validation error', errors.join(', ')));
        return;
      }
    }
    await row.update({ ...req.body, type: nextType, config: nextConfig, updated_at: new Date() });
    const plain = row.get({ plain: true });
    notificationEngineService.upsertChannelCache(plain);
    res.status(200).json({ data: plain });
  } catch (err) {
    log.error('Error updating notification channel:', err);
    res
      .status(500)
      .json(errorResponse('Failed to update channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
