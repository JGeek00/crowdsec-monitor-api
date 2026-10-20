import { dispatchChannels } from './sender';
import type { DispatchResult, NotificationSender } from '@/application/ports/notification-sender.port';
import type { NotificationChannelRef } from '@/domain/entities/notification.entity';

/**
 * Application-facing channel dispatcher: fires unsaved channel refs
 * (channel test endpoints) and returns per-channel results without
 * touching history.
 */
export const channelDispatcher = {
  dispatch(channels: NotificationChannelRef[], message: string, name: string): Promise<DispatchResult[]> {
    return dispatchChannels(channels, message, name);
  },
} satisfies Pick<NotificationSender, 'dispatch'>;
