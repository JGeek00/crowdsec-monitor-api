import type { NotificationAlertSnapshot } from '@/domain/entities/notification.entity';

export interface DispatchResult {
  type: string;
  ok: boolean;
  detail: string | null;
}

// Implemented by: infrastructure/notifications/dispatcher.ts (+ ntfy-sender/email-sender)
// Called by: application/use-cases/notifications/evaluate-alert, send-test
export interface NotificationSender {
  send(config: unknown, title: string, message: string, alert?: NotificationAlertSnapshot): Promise<DispatchResult>;
}
