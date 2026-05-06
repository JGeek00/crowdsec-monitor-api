import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { Alert, Alert_EventData, Alert_SourceInfo, UnparsedMetaData, Decision } from '@/models';

// On database model we use UnparsedMetaData because the JSON object is stored as a string on the table column
// It gets parsed and converted to ParsedMetaData on the endpoint controller

export interface AlertCreationAttributes extends Optional<Alert<UnparsedMetaData>, 'id' | 'created_at' | 'updated_at'> {}

export class AlertDb extends Model<Alert<UnparsedMetaData>, AlertCreationAttributes> implements Alert<UnparsedMetaData> {
  public id!: number;
  public uuid!: string;
  public scenario!: string;
  public scenario_version!: string;
  public scenario_hash!: string;
  public message!: string;
  public capacity!: number;
  public leakspeed!: string;
  public simulated!: boolean;
  public remediation!: boolean;
  public events_count!: number;
  public machine_id!: string;
  public source!: Alert_SourceInfo;
  public labels!: string[] | null;
  public meta!: UnparsedMetaData[];
  public events!: Alert_EventData<UnparsedMetaData>[];
  public crowdsec_created_at!: Date;
  public start_at!: Date;
  public stop_at!: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations will be set in models/index.ts
  public readonly decisions?: Decision[];

  // Column name references for use in Sequelize queries instead of string literals
  static readonly col = {
    id: 'id',
    uuid: 'uuid',
    scenario: 'scenario',
    scenarioVersion: 'scenario_version',
    scenarioHash: 'scenario_hash',
    message: 'message',
    capacity: 'capacity',
    leakspeed: 'leakspeed',
    simulated: 'simulated',
    remediation: 'remediation',
    eventsCount: 'events_count',
    machineId: 'machine_id',
    source: 'source',
    labels: 'labels',
    meta: 'meta',
    events: 'events',
    crowdsecCreatedAt: 'crowdsec_created_at',
    startAt: 'start_at',
    stopAt: 'stop_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  } as const;
}

AlertDb.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    scenario: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scenario_version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scenario_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    leakspeed: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    simulated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    remediation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    events_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    machine_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    source: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    labels: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    events: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    crowdsec_created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    start_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    stop_at: {
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
    tableName: 'alerts',
    underscored: true,
    timestamps: false,
    createdAt: false,
    updatedAt:false,
    indexes: [
      {
        name: 'idx_alerts_scenario',
        fields: ['scenario'],
      },
      {
        name: 'idx_alerts_simulated',
        fields: ['simulated'],
      },
      {
        name: 'idx_alerts_created_at',
        fields: ['created_at'],
      },
      {
        name: 'idx_alerts_start_at',
        fields: ['start_at'],
      },
    ],
  }
);
