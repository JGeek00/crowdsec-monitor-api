import { NotificationsTable, NotificationChannelsTable } from '@/models/db';
import type { UserNotification, UserNotificationChannel } from '@/models';
import type { NotificationRepository as NotificationRepositoryPort } from '@/application/ports/notification-repository.port';

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

  async updateFields(id: number, fields: Record<string, unknown>): Promise<UserNotification> {
    const row = await NotificationsTable.findByPk(id);
    if (!row) {
      throw new Error('Notification not found');
    }
    await row.update({ ...fields, updated_at: new Date() } as never);
    return row.get({ plain: true }) as UserNotification;
  }

  async deleteById(id: number): Promise<void> {
    await NotificationsTable.destroy({ where: { [NotificationsTable.col.id]: id } });
  }

  async listChannels(): Promise<UserNotificationChannel[]> {
    const rows = await NotificationChannelsTable.findAll();
    return rows.map((row) => row.toJSON() as UserNotificationChannel);
  }

  async createNotification(input: {
    name: string;
    description: string | null;
    enabled: boolean;
    condition: unknown;
    threshold: { count: number; windowSeconds: number; cooldownSeconds?: number } | null;
    message: string;
    includeAlertInfo: boolean;
    channelIds: number[];
  }): Promise<UserNotification> {
    const row = await NotificationsTable.create(input as UserNotification);
    return row.toJSON() as UserNotification;
  }

  async createChannel(input: { name: string; type: string; config: unknown }): Promise<UserNotificationChannel> {
    const row = await NotificationChannelsTable.create(input as UserNotificationChannel);
    return row.toJSON() as UserNotificationChannel;
  }
}
