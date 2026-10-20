import type { AlertDelivery } from '../alerts/AlertDelivery.model';
import type { NotificationChannelResponse, NotificationHistoryEntry, UserNotification } from '@/domain/entities';
import type { ProviderDefinition } from '@/constants/notification-providers';

export interface GetNotificationsResponse {
  data: UserNotification[];
}

export interface GetNotificationResponse {
  data: UserNotification;
}

export interface PostNotificationResponse {
  data: UserNotification;
}

export interface PutNotificationResponse {
  data: UserNotification;
}

export interface DeleteNotificationResponse {
  message: string;
}

export interface GetNotificationHistoryResponse {
  data: NotificationHistoryEntry[];
  total: number;
}

export interface GetNotificationHistoryAlertsResponse {
  data: AlertDelivery[];
}

export interface GetChannelsResponse {
  data: NotificationChannelResponse[];
}

export interface GetChannelResponse {
  data: NotificationChannelResponse;
}

export interface PostChannelResponse {
  data: NotificationChannelResponse;
}

export interface PutChannelResponse {
  data: NotificationChannelResponse;
}

export interface DeleteChannelResponse {
  message: string;
}

export interface PostChannelTestResponse {
  data: { channelId: number | null; ok: boolean; detail: string | null };
}

export interface GetProvidersResponse {
  version: number;
  providers: ProviderDefinition[];
}
