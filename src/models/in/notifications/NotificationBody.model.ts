import type {
  ConditionNode,
  NotificationChannelConfig,
  NotificationChannelType,
  NotificationThreshold,
} from '@/models';

export interface PostNotificationBody {
  name: string;
  description?: string | null;
  enabled?: boolean;
  condition: ConditionNode;
  threshold?: NotificationThreshold | null;
  message: string;
  channelIds: number[];
}

export interface PutNotificationBody {
  name?: string;
  description?: string | null;
  enabled?: boolean;
  condition?: ConditionNode;
  threshold?: NotificationThreshold | null;
  message?: string;
  channelIds?: number[];
}

export interface NotificationIdParams {
  id: string;
}

export interface PostToggleNotificationBody {
  enabled: boolean;
}

export interface PostChannelBody {
  name: string;
  type: NotificationChannelType;
  config: NotificationChannelConfig;
}

export interface PutChannelBody {
  name?: string;
  type?: NotificationChannelType;
  config?: NotificationChannelConfig;
}

export interface ChannelIdParams {
  id: string;
}

export interface PostChannelTestBody {
  message?: string;
}

export interface PostChannelTestInlineBody {
  type: NotificationChannelType;
  config: NotificationChannelConfig;
  message?: string;
}
