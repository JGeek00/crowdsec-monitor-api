import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface BlocklistIpAttributes {
  id: number;
  blocklist_id: number;
  scenario: string;
  value: string;
  type: string;
  scope: string;
  created_at: Date;
  updated_at: Date;
}

export interface BlocklistIpCreationAttributes extends Optional<BlocklistIpAttributes, 'created_at' | 'updated_at'> {}

export class BlocklistIp extends Model<BlocklistIpAttributes, BlocklistIpCreationAttributes> implements BlocklistIpAttributes {
  public id!: number;
  public blocklist_id!: number;
  public scenario!: string;
  public value!: string;
  public type!: string;
  public scope!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations set in models/index.ts
  public readonly blocklist?: any;
}

BlocklistIp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    blocklist_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lists',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    scenario: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scope: {
      type: DataTypes.STRING,
      allowNull: false,
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
    tableName: 'blocklist_ips',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default BlocklistIp;
