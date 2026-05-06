import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import type { CsBlocklist, BlocklistsTable, BlocklistIp, BlocklistIpOrigin } from '@/models';

export interface BlocklistIpCreationAttributes extends Optional<BlocklistIp, 'id' | 'blocklist_id' | 'cs_blocklist_id'> {}

export class BlocklistIpsTable extends Model<BlocklistIp, BlocklistIpCreationAttributes> implements BlocklistIp {
  public id!: number;
  public blocklist_id!: number | null;
  public cs_blocklist_id!: string | null;
  public blocklist_name!: string;
  public value!: string;
  public origin!: BlocklistIpOrigin;

  // Associations set in models/index.ts
  public readonly blocklist?: BlocklistsTable;
  public readonly csBlocklist?: CsBlocklist;

  // Column name references for use in Sequelize queries instead of string literals
  static readonly col = {
    id: 'id',
    blocklistId: 'blocklist_id',
    csBlocklistId: 'cs_blocklist_id',
    blocklistName: 'blocklist_name',
    value: 'value',
    origin: 'origin',
  } as const;
}

BlocklistIpsTable.init(
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
      type: DataTypes.STRING(50),
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
