import { Request, Response } from 'express';
import { ChannelIdParams, PostChannelTestBody, PostChannelTestResponse, ResponseWithError } from '@/models';
import { NotificationChannelsTable } from '@/models';
import { dispatchChannels } from '@/services/notifications/notification-sender.service';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<PostChannelTestResponse>;

/** Send a test message through the channel. Result is returned, not stored in history. */
export async function testChannel(
  req: Request<ChannelIdParams, Res, PostChannelTestBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const row = await NotificationChannelsTable.findByPk(Number(req.params.id));
    if (!row) {
      res.status(404).json(errorResponse('Not found', 'Channel not found'));
      return;
    }
    const plain = row.get({ plain: true });
    const message = req.body.message?.trim() || `Test notification from "${plain.name}"`;
    const [result] = await dispatchChannels([{ type: plain.type, config: plain.config }], message, plain.name);
    res.status(200).json({
      data: { channelId: plain.id, ok: result?.ok ?? false, detail: result?.detail ?? 'no result' },
    });
  } catch (err) {
    log.error('Error testing notification channel:', err);
    res.status(500).json(errorResponse('Failed to test channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
