import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';

export type BlocklistIpOrigin = 'blocklist' | 'cs_blocklist';

export interface BlocklistIpAttributes {
  id: number;
  blocklist_id: number | null;
  cs_blocklist_id: number | null;
  blocklist_name: string;
  value: string;
  origin: BlocklistIpOrigin;
}

export interface BlocklistIpCreationAttributes extends Optional<BlocklistIpAttributes, 'id' | 'blocklist_id' | 'cs_blocklist_id'> {}

export class BlocklistIp extends Model<BlocklistIpAttributes, BlocklistIpCreationAttributes> implements BlocklistIpAttributes {
  public id!: number;
  public blocklist_id!: number | null;
  public cs_blocklist_id!: number | null;
  public blocklist_name!: string;
  public value!: string;
  public origin!: BlocklistIpOrigin;

  // Associations set in models/index.ts
  public readonly blocklist?: any;
  public readonly csBlocklist?: any;
}

BlocklistIp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    blocklist_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'blocklists',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    cs_blocklist_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cs_blocklists',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    blocklist_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    origin: {
      type: DataTypes.ENUM('blocklist', 'cs_blocklist'),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'blocklist_ips',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['blocklist_id', 'value'],
      },
      {
        unique: true,
        fields: ['cs_blocklist_id', 'value'],
      },
    ],
  }
);

export default BlocklistIp;
