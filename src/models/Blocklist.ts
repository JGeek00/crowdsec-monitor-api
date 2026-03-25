import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';

export interface BlocklistAttributes {
  id: number;
  url: string;
  name: string;
  enabled: boolean;
  added_date: Date;
  last_refresh_attempt: Date | null;
  last_successful_refresh: Date | null;
}

export interface BlocklistCreationAttributes extends Optional<BlocklistAttributes, 'id' | 'enabled' | 'last_refresh_attempt' | 'last_successful_refresh'> {}

export class Blocklist extends Model<BlocklistAttributes, BlocklistCreationAttributes> implements BlocklistAttributes {
  public id!: number;
  public url!: string;
  public name!: string;
  public enabled!: boolean;
  public added_date!: Date;
  public last_refresh_attempt!: Date | null;
  public last_successful_refresh!: Date | null;

  // Associations set in models/index.ts
  public readonly blocklistIps?: any[];
}

Blocklist.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    added_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_refresh_attempt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_successful_refresh: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'blocklists',
    timestamps: false,
  }
);

export default Blocklist;
