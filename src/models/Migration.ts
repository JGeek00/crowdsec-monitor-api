import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';

export interface MigrationAttributes {
  id: number;
  name: string;
  applied_at: Date;
}

export interface MigrationCreationAttributes extends Optional<MigrationAttributes, 'id' | 'applied_at'> { }

export class Migration extends Model<MigrationAttributes, MigrationCreationAttributes> implements MigrationAttributes {
  public id!: number;
  public name!: string;
  public applied_at!: Date;

  static readonly col = {
    id: 'id',
    name: 'name',
    appliedAt: 'applied_at',
  } as const;

  private static _initialized = false;

  static async ensureInitialized(): Promise<void> {
    if (this._initialized) return;
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
          autoIncrement: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        applied_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'migrations',
        timestamps: false,
        underscored: true,
      }
    );
    this._initialized = true;
  }
}

export default Migration;
