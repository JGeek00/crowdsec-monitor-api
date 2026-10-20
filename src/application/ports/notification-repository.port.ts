import type {
  ConditionNode,
  NotificationChannelConfig,
  UserNotification,
  UserNotificationChannel,
} from '@/domain/entities/notification.entity';

/** Updatable notification fields (partial update payload). */
export interface NotificationUpdateFields {
  name?: string;
  description?: string | null;
  enabled?: boolean;
  condition?: ConditionNode;
  threshold?: { count: number; windowSeconds: number; cooldownSeconds?: number } | null;
  message?: string;
  includeAlertInfo?: boolean;
  channelIds?: number[];
}

/** Updatable channel fields (partial update payload). */
export interface ChannelUpdateFields {
  name?: string;
  type?: string;
  config?: NotificationChannelConfig;
}

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-notification.repository.ts
// Called by: application/use-cases/notifications/*, application/use-cases/notifications/send-test
export interface NotificationRepository {
  listNotifications(): Promise<UserNotification[]>;
  /** All notifications ordered by id ASC (legacy list endpoint). */
  listOrdered(): Promise<UserNotification[]>;
  findById(id: number): Promise<UserNotification | null>;
  updateFields(id: number, fields: NotificationUpdateFields): Promise<UserNotification>;
  deleteById(id: number): Promise<void>;
  listChannels(): Promise<UserNotificationChannel[]>;
  findChannelById(id: number): Promise<UserNotificationChannel | null>;
  updateChannel(id: number, fields: ChannelUpdateFields): Promise<UserNotificationChannel>;
  deleteChannelById(id: number): Promise<void>;
  createNotification(input: {
    name: string;
    description: string | null;
    enabled: boolean;
    condition: ConditionNode;
    threshold: { count: number; windowSeconds: number; cooldownSeconds?: number } | null;
    message: string;
    includeAlertInfo: boolean;
    channelIds: number[];
  }): Promise<UserNotification>;
  createChannel(input: {
    name: string;
    type: string;
    config: NotificationChannelConfig;
  }): Promise<UserNotificationChannel>;
  /** Ids among `ids` that exist as channel rows (legacy channel-refs helper). */
  findChannelIdsByIds(ids: number[]): Promise<number[]>;
  /** Ids of notifications whose channelIds include `channelId`. */
  findNotificationsUsingChannel(channelId: number): Promise<number[]>;
}
