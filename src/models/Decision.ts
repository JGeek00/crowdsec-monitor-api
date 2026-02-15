import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { SourceInfo } from './Alert';

export interface DecisionAttributes {
  id: number;
  alert_id: number;
  origin: string;
  type: string;
  scope: string;
  value: string;
  expiration: Date;
  scenario: string;
  simulated: boolean;
  source: SourceInfo;
  crowdsec_created_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DecisionCreationAttributes extends Optional<DecisionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Decision extends Model<DecisionAttributes, DecisionCreationAttributes> implements DecisionAttributes {
  public id!: number;
  public alert_id!: number;
  public origin!: string;
  public type!: string;
  public scope!: string;
  public value!: string;
  public expiration!: Date;
  public scenario!: string;
  public simulated!: boolean;
  public source!: SourceInfo;
  public crowdsec_created_at!: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations will be set in models/index.ts
  public readonly alert?: any;
}

Decision.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
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
    expiration: {
      type: DataTypes.DATE,
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
    source: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    crowdsec_created_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
    timestamps: false,
    createdAt: false,
    updatedAt:false,
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
        name: 'idx_decisions_crowdsec_created_at',
        fields: ['crowdsec_created_at'],
      },
      {
        name: 'idx_decisions_created_at',
        fields: ['created_at'],
      },
    ],
  }
);
