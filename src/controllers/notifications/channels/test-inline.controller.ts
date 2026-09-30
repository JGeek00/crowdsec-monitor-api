import { Request, Response } from 'express';
import { PostChannelTestInlineBody, PostChannelTestResponse, ResponseWithError } from '@/models';
import { dispatchChannels } from '@/services/notifications/notification-sender.service';
import { validateChannelConfig } from '@/utils/notification-channel';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<PostChannelTestResponse>;

/** Test an unsaved channel config. Result is returned, not stored in history. */
export async function testInlineChannel(
  req: Request<object, Res, PostChannelTestInlineBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const { type, config, message } = req.body;
    const errors = validateChannelConfig(type, config);
    if (errors.length > 0) {
      res.status(400).json(errorResponse('Validation error', errors.join(', ')));
      return;
    }
    const text = message?.trim() || 'Test notification';
    const [result] = await dispatchChannels([{ type, config }], text, 'Channel test');
    res.status(200).json({
      data: { channelId: null, ok: result?.ok ?? false, detail: result?.detail ?? 'no result' },
    });
  } catch (err) {
    log.error('Error testing inline channel:', err);
    res.status(500).json(errorResponse('Failed to test channel', err instanceof Error ? err.message : 'Unknown error'));
  }
}
