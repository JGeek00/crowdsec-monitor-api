import { Request, Response } from 'express';
import { PostChannelBody, PostChannelResponse, ResponseWithError } from '@/models';
import { NotificationChannelsTable } from '@/models';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { validateChannelConfig } from '@/utils/notification-channel';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<PostChannelResponse>;

export async function createChannel(req: Request<object, Res, PostChannelBody>, res: Response<Res>): Promise<void> {
  try {
    const { name, type, config } = req.body;
    const errors = validateChannelConfig(type, config);
    if (errors.length > 0) {
      res.status(400).json(errorResponse('Validation error', errors.join(', ')));
      return;
    }
    const row = await NotificationChannelsTable.create({
      name: name.trim(),
      type,
      config,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const plain = row.get({ plain: true });
    notificationEngineService.upsertChannelCache(plain);
    res.status(201).json({ data: plain });
  } catch (err) {
    log.error('Error creating notification channel:', err);
    res
      .status(500)
      .json(errorResponse('Failed to create channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
