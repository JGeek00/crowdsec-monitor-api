import type {
  NotificationAlertSnapshot,
  NotificationChannelConfig,
  NotificationChannelRef,
} from '@/domain/entities/notification.entity';

export interface DispatchResult {
  type: string;
  ok: boolean;
  detail: string | null;
}

// Implemented by: infrastructure/notifications/dispatcher.ts (+ ntfy-sender/email-sender)
// Called by: application/use-cases/notifications/evaluate-alert, send-test
export interface NotificationSender {
  send(
    config: NotificationChannelConfig,
    title: string,
    message: string,
    alert?: NotificationAlertSnapshot,
  ): Promise<DispatchResult>;
  /** Fire one or more unsaved channel refs (test endpoints); results are not stored in history. */
  dispatch(channels: NotificationChannelRef[], message: string, name: string): Promise<DispatchResult[]>;
}
