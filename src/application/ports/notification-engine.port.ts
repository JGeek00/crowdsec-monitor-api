import type { UserNotification } from '@/domain/entities/notification.entity';

// Implemented by: infrastructure/notifications/engine
// Called by: application/use-cases/notifications/*
export interface NotificationEnginePort {
  /** Inserts/refreshes the in-memory condition cache for one notification. */
  upsertCache(notification: UserNotification): void;
  removeFromCache(id: number): void;
}

// Implemented by: infrastructure/notifications/history
// Called by: application/use-cases/notifications/*
export interface NotificationHistoryPort {
  list(): unknown[];
}
