import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import type { Alert_SourceInfo, Alert, UnparsedMetaData, Decision } from '@/models';

export interface DecisionCreationAttributes extends Optional<Decision, 'id' | 'created_at' | 'updated_at'> {}

class DecisionsTable extends Model<Decision, DecisionCreationAttributes> implements Decision {
  public id!: number;
  public alert_id!: number;
  public origin!: string;
  public type!: string;
  public scope!: string;
  public value!: string;
  public expiration!: Date;
  public scenario!: string;
  public simulated!: boolean;
  public source!: Alert_SourceInfo;
  public crowdsec_created_at!: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations will be set in models/index.ts
  public readonly alert?: Alert<UnparsedMetaData>;

  // Column name references for use in Sequelize queries instead of string literals
  static readonly col = {
    id: 'id',
    alertId: 'alert_id',
    origin: 'origin',
    type: 'type',
    scope: 'scope',
    value: 'value',
    expiration: 'expiration',
    scenario: 'scenario',
    simulated: 'simulated',
    source: 'source',
    crowdsecCreatedAt: 'crowdsec_created_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  } as const;
}

DecisionsTable.init(
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

export default DecisionsTable;