import type { NotificationChannelResponse, UserNotificationChannel } from '@/models';
import { findProvider } from '@/constants/notification-providers';
import { sanitizeChannelConfig } from '@/utils/notification-channel';

/** Shape channel rows for API responses: secrets are never exposed; provider support flags are derived. */
export function toChannelResponse(channel: UserNotificationChannel): NotificationChannelResponse {
  return {
    ...channel,
    supportsAlertInfo: findProvider(channel.type)?.supportsAlertInfo === true,
    config: sanitizeChannelConfig(
      channel.type,
      channel.config as unknown as Record<string, unknown>,
    ) as unknown as UserNotificationChannel['config'],
  };
}
