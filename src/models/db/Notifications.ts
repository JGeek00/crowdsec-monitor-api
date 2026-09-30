import { DataTypes, Model } from '@sequelize/core';
import { sequelize } from '@/config/database';
import { Optional } from '@/types/database.types';
import type { ConditionNode, NotificationThreshold, UserNotification } from '@/models';

export type NotificationCreationAttributes = Optional<UserNotification, 'id' | 'created_at' | 'updated_at'>;

class NotificationsTable extends Model<UserNotification, NotificationCreationAttributes> implements UserNotification {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public enabled!: boolean;
  public condition!: ConditionNode;
  public threshold!: NotificationThreshold | null;
  public message!: string;
  public channelIds!: number[];
  public created_at!: Date;
  public updated_at!: Date;

  static readonly col = {
    id: 'id',
    name: 'name',
    description: 'description',
    enabled: 'enabled',
    condition: 'condition',
    threshold: 'threshold',
    message: 'message',
    channelIds: 'channel_ids',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  } as const;
}

NotificationsTable.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    condition: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    threshold: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    channelIds: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    underscored: true,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    indexes: [{ name: 'idx_notifications_enabled', fields: ['enabled'] }],
  },
);

export default NotificationsTable;
