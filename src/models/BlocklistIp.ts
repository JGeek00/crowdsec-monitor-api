import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface BlocklistIpAttributes {
  id: number;
  blocklist_id: number;
  value: string;
}

export interface BlocklistIpCreationAttributes extends Optional<BlocklistIpAttributes, 'id'> {}

export class BlocklistIp extends Model<BlocklistIpAttributes, BlocklistIpCreationAttributes> implements BlocklistIpAttributes {
  public id!: number;
  public blocklist_id!: number;
  public value!: string;

  // Associations set in models/index.ts
  public readonly blocklist?: any;
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
      allowNull: false,
      references: {
        model: 'blocklists',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    value: {
      type: DataTypes.STRING,
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
    ],
  }
);

export default BlocklistIp;
