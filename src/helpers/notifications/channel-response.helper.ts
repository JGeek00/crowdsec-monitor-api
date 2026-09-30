import type { UserNotificationChannel } from '@/models';
import { sanitizeChannelConfig } from '@/utils/notification-channel';

/** Shape channel rows for API responses: secrets are never exposed. */
export function toChannelResponse(channel: UserNotificationChannel): UserNotificationChannel {
  return {
    ...channel,
    config: sanitizeChannelConfig(
      channel.type,
      channel.config as unknown as Record<string, unknown>,
    ) as unknown as UserNotificationChannel['config'],
  };
}
