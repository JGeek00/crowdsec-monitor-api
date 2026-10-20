import type { UserNotification, UserNotificationChannel } from '@/domain/entities/notification.entity';

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-notification.repository.ts
// Called by: application/use-cases/notifications/*, application/use-cases/notifications/send-test
export interface NotificationRepository {
  listNotifications(): Promise<UserNotification[]>;
  listChannels(): Promise<UserNotificationChannel[]>;
  createNotification(input: {
    name: string;
    description: string | null;
    enabled: boolean;
    condition: unknown;
    threshold: { count: number; windowSeconds: number; cooldownSeconds?: number } | null;
    message: string;
    includeAlertInfo: boolean;
    channelIds: number[];
  }): Promise<UserNotification>;
  createChannel(input: { name: string; type: string; config: unknown }): Promise<UserNotificationChannel>;
}
