export type NotificationField = 'scenario' | 'country' | 'target' | 'origin' | 'type' | 'scope' | 'ipOwner';

export type NotificationOperator = 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains';

export interface NotificationLeaf {
  type: 'leaf';
  field: NotificationField;
  operator: NotificationOperator;
  value: string | string[];
}

export interface NotificationAnd {
  type: 'and';
  children: ConditionNode[];
}

export interface NotificationOr {
  type: 'or';
  children: ConditionNode[];
}

export interface NotificationNot {
  type: 'not';
  child: ConditionNode;
}

export type ConditionNode = NotificationLeaf | NotificationAnd | NotificationOr | NotificationNot;

export interface NotificationThreshold {
  count: number;
  windowSeconds: number;
  cooldownSeconds?: number;
}

export type NotificationChannelType = 'ntfy' | 'email';

export interface NtfyChannelConfig {
  server?: string;
  topic: string;
  username?: string;
  password?: string;
  accessToken?: string;
  priority?: string;
  tags?: string;
}

export interface EmailChannelConfig {
  host: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  from: string;
  to: string;
}

export type NotificationChannelConfig = NtfyChannelConfig | EmailChannelConfig;

export interface NotificationChannelRef {
  type: NotificationChannelType;
  config: NotificationChannelConfig;
}

export interface UserNotificationChannel {
  id: number;
  name: string;
  type: NotificationChannelType;
  config: NotificationChannelConfig;
  created_at: Date;
  updated_at: Date;
}

export interface UserNotification {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
  condition: ConditionNode;
  threshold: NotificationThreshold | null;
  message: string;
  channelIds: number[];
  created_at: Date;
  updated_at: Date;
}

export interface NotificationHistoryEntry {
  id: string;
  notificationId: number;
  notificationName: string;
  message: string;
  triggeredAt: string;
  channels: { type: string; ok: boolean; detail: string | null }[];
}
