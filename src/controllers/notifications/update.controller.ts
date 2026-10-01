import { Request, Response } from 'express';
import {
  NotificationsTable,
  NotificationIdParams,
  PutNotificationBody,
  PutNotificationResponse,
  ResponseWithError,
} from '@/models';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { findMissingChannelIds } from '@/helpers/notifications/channel-refs.helper';
import { withThresholdDefaults } from '@/helpers/notifications/threshold-defaults.helper';
import { isValidCondition } from '@/utils/notification-condition';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<PutNotificationResponse>;

export async function updateNotification(
  req: Request<NotificationIdParams, Res, PutNotificationBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const row = await NotificationsTable.findByPk(Number(req.params.id));
    if (!row) {
      res.status(404).json(errorResponse('Not found', 'Notification not found'));
      return;
    }
    if (req.body.condition !== undefined && !isValidCondition(req.body.condition)) {
      res.status(400).json(errorResponse('Validation error', 'condition has an unsupported shape'));
      return;
    }
    if (req.body.channelIds !== undefined) {
      const missing = await findMissingChannelIds(req.body.channelIds);
      if (missing.length > 0) {
        res.status(422).json(errorResponse('Unprocessable entity', `Unknown channel(s): ${missing.join(', ')}`));
        return;
      }
    }
    const { channelIds, threshold, ...rest } = req.body;
    await row.update({
      ...rest,
      ...(threshold !== undefined ? { threshold: withThresholdDefaults(threshold) } : {}),
      ...(channelIds !== undefined ? { channelIds: [...new Set(channelIds)] } : {}),
      updated_at: new Date(),
    });
    const plain = row.get({ plain: true });
    notificationEngineService.upsertCache(plain);
    res.status(200).json({ data: plain });
  } catch (err) {
    log.error('Error updating notification:', err);
    res
      .status(500)
      .json(errorResponse('Failed to update notification', err instanceof Error ? err.message : 'Unknown error'));
  }
}
