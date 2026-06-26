import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { Blocklist, BlocklistIpsTable } from '@/models';

export type BlocklistCreationAttributes = Optional<
  Blocklist,
  'id' | 'enabled' | 'last_refresh_attempt' | 'last_successful_refresh' | 'last_refresh_failed'
>;

class BlocklistsTable extends Model<Blocklist, BlocklistCreationAttributes> implements Blocklist {
  public id!: number;
  public url!: string;
  public name!: string;
  public enabled!: boolean;
  public added_date!: Date;
  public last_refresh_attempt!: Date | null;
  public last_successful_refresh!: Date | null;
  public last_refresh_failed!: boolean | null;

  // Associations set in models/index.ts
  public readonly blocklistIps?: BlocklistIpsTable[];

  // Column name references for use in Sequelize queries instead of string literals
  static readonly col = {
    id: 'id',
    url: 'url',
    name: 'name',
    enabled: 'enabled',
    addedDate: 'added_date',
    lastRefreshAttempt: 'last_refresh_attempt',
    lastSuccessfulRefresh: 'last_successful_refresh',
    lastRefreshFailed: 'last_refresh_failed',
  } as const;
}

BlocklistsTable.init(
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
    last_refresh_failed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'blocklists',
    timestamps: false,
  },
);

export default BlocklistsTable;
