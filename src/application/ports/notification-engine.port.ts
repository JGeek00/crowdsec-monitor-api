import type { NotificationHistoryEntry, UserNotification, UserNotificationChannel } from '@/domain/entities';

// Implemented by: infrastructure/notifications/engine
// Called by: application/use-cases/notifications/*
export interface NotificationEnginePort {
  /** Inserts/refreshes the in-memory condition cache for one notification. */
  upsertCache(notification: UserNotification): void;
  removeFromCache(id: number): void;
  /** Channel condition caches (channels CRUD endpoints). */
  upsertChannelCache(channel: UserNotificationChannel): void;
  removeChannelCache(id: number): void;
}

// Implemented by: infrastructure/notifications/history
// Called by: application/use-cases/notifications/*
export interface NotificationHistoryPort {
  list(): unknown[];
  find(id: string): NotificationHistoryEntry | undefined;
}
