import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';

export interface CsBlocklistAttributes {
  id: string;
  name: string;
}

export interface CsBlocklistCreationAttributes extends Optional<CsBlocklistAttributes, never> {}

export class CsBlocklist extends Model<CsBlocklistAttributes, CsBlocklistCreationAttributes> implements CsBlocklistAttributes {
  public id!: string;
  public name!: string;

  // Associations set in models/index.ts
  public readonly blocklistIps?: any[];
}

CsBlocklist.init(
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
