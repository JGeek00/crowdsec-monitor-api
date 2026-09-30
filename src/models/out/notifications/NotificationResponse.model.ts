import type { NotificationHistoryEntry, UserNotification, UserNotificationChannel } from '@/models';
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

export interface GetChannelsResponse {
  data: UserNotificationChannel[];
}

export interface GetChannelResponse {
  data: UserNotificationChannel;
}

export interface PostChannelResponse {
  data: UserNotificationChannel;
}

export interface PutChannelResponse {
  data: UserNotificationChannel;
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
