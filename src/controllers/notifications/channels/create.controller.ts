import { Request, Response } from 'express';
import { NotificationChannelType, PostChannelBody, PostChannelResponse, ResponseWithError } from '@/models';
import { NotificationChannelsTable } from '@/models';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { validateChannelConfig } from '@/utils/notification-channel';
import { errorResponse } from '@/utils/error-response';
import { toChannelResponse } from '@/helpers/notifications/channel-response.helper';
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
      // Validated against the provider definition above; stored types are the built-ins for now.
      type: type as NotificationChannelType,
      config,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const plain = row.get({ plain: true });
    notificationEngineService.upsertChannelCache(plain);
    res.status(201).json({ data: toChannelResponse(plain) });
  } catch (err) {
    log.error('Error creating notification channel:', err);
    res
      .status(500)
      .json(errorResponse('Failed to create channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
