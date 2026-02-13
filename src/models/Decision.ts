import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface DecisionAttributes {
  id: number;
  crowdsec_decision_id: number;
  alert_id: number;
  origin: string;
  type: string;
  scope: string;
  value: string;
  duration: string;
  scenario: string;
  simulated: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DecisionCreationAttributes extends Optional<DecisionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Decision extends Model<DecisionAttributes, DecisionCreationAttributes> implements DecisionAttributes {
  public id!: number;
  public crowdsec_decision_id!: number;
  public alert_id!: number;
  public origin!: string;
  public type!: string;
  public scope!: string;
  public value!: string;
  public duration!: string;
  public scenario!: string;
  public simulated!: boolean;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations will be set in models/index.ts
  public readonly alert?: any;
}

Decision.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    crowdsec_decision_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    alert_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'alerts',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    origin: {
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
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scenario: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    simulated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'decisions',
    underscored: true,
    indexes: [
      {
        name: 'idx_decisions_alert_id',
        fields: ['alert_id'],
      },
      {
        name: 'idx_decisions_type',
        fields: ['type'],
      },
      {
        name: 'idx_decisions_scope',
        fields: ['scope'],
      },
      {
        name: 'idx_decisions_value',
        fields: ['value'],
      },
      {
        name: 'idx_decisions_simulated',
        fields: ['simulated'],
      },
      {
        name: 'idx_decisions_created_at',
        fields: ['created_at'],
      },
    ],
  }
);
