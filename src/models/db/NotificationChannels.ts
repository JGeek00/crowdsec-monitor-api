import { DataTypes, Model } from '@sequelize/core';
import { sequelize } from '@/config/database';
import { Optional } from '@/types/database.types';
import type { NotificationChannelConfig, NotificationChannelType, UserNotificationChannel } from '@/models';

export type NotificationChannelCreationAttributes = Optional<
  UserNotificationChannel,
  'id' | 'created_at' | 'updated_at'
>;

class NotificationChannelsTable
  extends Model<UserNotificationChannel, NotificationChannelCreationAttributes>
  implements UserNotificationChannel
{
  public id!: number;
  public name!: string;
  public type!: NotificationChannelType;
  public config!: NotificationChannelConfig;
  public created_at!: Date;
  public updated_at!: Date;

  static readonly col = {
    id: 'id',
    name: 'name',
    type: 'type',
    config: 'config',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  } as const;
}

NotificationChannelsTable.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false },
    config: { type: DataTypes.JSON, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'notification_channels',
    underscored: true,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  },
);

export default NotificationChannelsTable;
