import type { Order, WhereOptions } from '@sequelize/core';
import { NotificationChannelsTable, NotificationsTable } from '@/infrastructure/persistence/sequelize/models';
import type { UserNotificationChannel as ChannelAttributes } from '@/domain/entities';
import type { UserNotification as NotificationAttributes } from '@/domain/entities';
import type { UserNotification, UserNotificationChannel } from '@/domain/entities';
import type {
  ChannelUpdateFields,
  NotificationRepository as NotificationRepositoryPort,
  NotificationUpdateFields,
} from '@/application/ports/notification-repository.port';
import type { ConditionNode, NotificationChannelConfig } from '@/domain/entities';

/**
 * Sequelize implementation of the NotificationRepository port.
 * Aggregate root (R3): a notification includes its channel references.
 */
export class SequelizeNotificationRepository implements NotificationRepositoryPort {
  async listNotifications(): Promise<UserNotification[]> {
    const rows = await NotificationsTable.findAll();
    return rows.map((row) => row.toJSON() as UserNotification);
  }

  async listOrdered(): Promise<UserNotification[]> {
    const rows = await NotificationsTable.findAll({ order: [['id', 'ASC']] });
    return rows.map((row) => row.get({ plain: true }) as UserNotification);
  }

  async findById(id: number): Promise<UserNotification | null> {
    const row = await NotificationsTable.findByPk(id);
    return row ? (row.get({ plain: true }) as UserNotification) : null;
  }

  async updateFields(id: number, fields: NotificationUpdateFields): Promise<UserNotification> {
    const row = await NotificationsTable.findByPk(id);
    if (!row) {
      throw new Error('Notification not found');
    }
    await row.update({ ...fields, updated_at: new Date() });
    return row.get({ plain: true }) as UserNotification;
  }

  async deleteById(id: number): Promise<void> {
    await NotificationsTable.destroy({ where: { [NotificationsTable.col.id]: id } });
  }

  async listChannels(): Promise<UserNotificationChannel[]> {
    const order: Order = [['id', 'ASC']];
    const rows = await NotificationChannelsTable.findAll({ order });
    return rows.map((row) => row.toJSON() as UserNotificationChannel);
  }

  async findChannelById(id: number): Promise<UserNotificationChannel | null> {
    const row = await NotificationChannelsTable.findByPk(id);
    return row ? (row.get({ plain: true }) as UserNotificationChannel) : null;
  }

  async updateChannel(id: number, fields: ChannelUpdateFields): Promise<UserNotificationChannel> {
    const row = await NotificationChannelsTable.findByPk(id);
    if (!row) {
      throw new Error('Channel not found');
    }
    await row.update({ ...fields, updated_at: new Date() });
    return row.get({ plain: true }) as UserNotificationChannel;
  }

  async deleteChannelById(id: number): Promise<void> {
    const where: WhereOptions<ChannelAttributes> = { [NotificationChannelsTable.col.id]: id };
    await NotificationChannelsTable.destroy({ where });
  }

  async createNotification(input: {
    name: string;
    description: string | null;
    enabled: boolean;
    condition: ConditionNode;
    threshold: { count: number; windowSeconds: number; cooldownSeconds?: number } | null;
    message: string;
    includeAlertInfo: boolean;
    channelIds: number[];
  }): Promise<UserNotification> {
    const row = await NotificationsTable.create(input);
    return row.toJSON() as UserNotification;
  }

  async createChannel(input: {
    name: string;
    type: string;
    config: NotificationChannelConfig;
  }): Promise<UserNotificationChannel> {
    const row = await NotificationChannelsTable.create({
      ...input,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return row.get({ plain: true }) as UserNotificationChannel;
  }

  async findChannelIdsByIds(ids: number[]): Promise<number[]> {
    if (ids.length === 0) return [];
    const where: WhereOptions<ChannelAttributes> = { id: ids };
    const rows = await NotificationChannelsTable.findAll({ where });
    return rows.map((row) => row.get({ plain: true }).id);
  }

  async findNotificationsUsingChannel(channelId: number): Promise<number[]> {
    const all = await NotificationsTable.findAll();
    const notifications: NotificationAttributes[] = all.map((row) => row.get({ plain: true }));
    return notifications.filter((n) => (n.channelIds ?? []).includes(channelId)).map((n) => n.id);
  }
}
