import { Request, Response } from 'express';
import {
  ChannelIdParams,
  NotificationChannelConfig,
  NotificationChannelType,
  PutChannelBody,
  PutChannelResponse,
  ResponseWithError,
} from '@/models';
import { NotificationChannelsTable } from '@/models';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { isSecretKey, validateChannelConfig } from '@/utils/notification-channel';
import { errorResponse } from '@/utils/error-response';
import { toChannelResponse } from '@/helpers/notifications/channel-response.helper';
import { log } from '@/services/log.service';

type Res = ResponseWithError<PutChannelResponse>;

/**
 * Config merge rule (same provider type): incoming keys win; keys absent from
 * the payload keep their stored value (so omitted secrets survive edits); an
 * empty-string secret deletes it. When switching provider type the incoming
 * config is validated alone (old keys would be unknown fields otherwise).
 */
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
    const plain = row.get({ plain: true });
    const nextType = req.body.type ?? plain.type;
    if (req.body.type !== undefined && req.body.type !== plain.type && req.body.config === undefined) {
      res.status(400).json(errorResponse('Validation error', 'config is required when changing provider type'));
      return;
    }
    const typeChanged = req.body.type !== undefined && req.body.type !== plain.type;
    let nextConfig = plain.config as unknown as Record<string, unknown>;
    if (req.body.config !== undefined) {
      const incoming = req.body.config as unknown as Record<string, unknown>;
      const merged: Record<string, unknown> = typeChanged
        ? {}
        : { ...(plain.config as unknown as Record<string, unknown>) };
      for (const [key, value] of Object.entries(incoming)) {
        if (typeof value === 'string' && value === '' && isSecretKey(nextType, key)) {
          delete merged[key];
        } else {
          merged[key] = value;
        }
      }
      const errors = validateChannelConfig(nextType, merged);
      if (errors.length > 0) {
        res.status(400).json(errorResponse('Validation error', errors.join(', ')));
        return;
      }
      nextConfig = merged;
    }
    await row.update({
      ...(req.body.name !== undefined ? { name: req.body.name.trim() } : {}),
      // Validated against the provider definition above; stored types are the built-ins for now.
      type: nextType as NotificationChannelType,
      config: nextConfig as unknown as NotificationChannelConfig,
      updated_at: new Date(),
    });
    const updated = row.get({ plain: true });
    notificationEngineService.upsertChannelCache(updated);
    res.status(200).json({ data: toChannelResponse(updated) });
  } catch (err) {
    log.error('Error updating notification channel:', err);
    res
      .status(500)
      .json(errorResponse('Failed to update channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
