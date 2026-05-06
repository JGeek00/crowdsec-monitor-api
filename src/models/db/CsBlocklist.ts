import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import type { BlocklistIp, CsBlocklist } from '@/models';

export interface CsBlocklistCreationAttributes extends Optional<CsBlocklist, never> {}

export class CsBlocklistsTable extends Model<CsBlocklist, CsBlocklistCreationAttributes> implements CsBlocklist {
  public id!: string;
  public name!: string;

  // Associations set in models/index.ts
  public readonly blocklistIps?: BlocklistIp[];

  // Column name references for use in Sequelize queries instead of string literals
  static readonly col = {
    id: 'id',
    name: 'name',
  } as const;
}

CsBlocklistsTable.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'cs_blocklists',
    timestamps: false,
  }
);

export default CsBlocklist;
