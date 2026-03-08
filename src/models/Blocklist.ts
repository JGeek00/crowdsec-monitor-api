import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface BlocklistAttributes {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface BlocklistCreationAttributes extends Optional<BlocklistAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Blocklist extends Model<BlocklistAttributes, BlocklistCreationAttributes> implements BlocklistAttributes {
  public id!: number;
  public name!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations set in models/index.ts
  public readonly blocklistIps?: any[];
}

Blocklist.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
    tableName: 'lists',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Blocklist;
