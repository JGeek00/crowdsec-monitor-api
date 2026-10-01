import { Request, Response } from 'express';
import { NotificationsTable, PostNotificationBody, PostNotificationResponse, ResponseWithError } from '@/models';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { findMissingChannelIds } from '@/helpers/notifications/channel-refs.helper';
import { withThresholdDefaults } from '@/helpers/notifications/threshold-defaults.helper';
import { isValidCondition } from '@/utils/notification-condition';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<PostNotificationResponse>;

export async function createNotification(
  req: Request<object, Res, PostNotificationBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const { name, description, enabled, condition, threshold, message, channelIds } = req.body;
    if (!isValidCondition(condition)) {
      res.status(400).json(errorResponse('Validation error', 'condition has an unsupported shape'));
      return;
    }
    const missing = await findMissingChannelIds(channelIds);
    if (missing.length > 0) {
      res.status(422).json(errorResponse('Unprocessable entity', `Unknown channel(s): ${missing.join(', ')}`));
      return;
    }
    const row = await NotificationsTable.create({
      name: name.trim(),
      description: description?.trim() ? description.trim() : null,
      enabled: enabled ?? true,
      condition,
      threshold: withThresholdDefaults(threshold),
      message: message.trim(),
      channelIds: [...new Set(channelIds)],
      created_at: new Date(),
      updated_at: new Date(),
    });
    const plain = row.get({ plain: true });
    await notificationEngineService.upsertCache(plain);
    res.status(201).json({ data: plain });
  } catch (err) {
    log.error('Error creating notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to create notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
