import { dispatchChannels } from './sender';
import type { DispatchResult, NotificationSender } from '@/application/ports/notification-sender.port';

/**
 * Application-facing channel dispatcher: fires unsaved channel refs
 * (channel test endpoints) and returns per-channel results without
 * touching history.
 */
export const channelDispatcher = {
  dispatch(channels: unknown[], message: string, name: string): Promise<DispatchResult[]> {
    return dispatchChannels(channels as never, message, name);
  },
} satisfies Pick<NotificationSender, 'dispatch'>;
