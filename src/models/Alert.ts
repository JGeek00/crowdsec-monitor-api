import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Source information interface
export interface SourceInfo {
  as_name?: string;
  as_number?: string;
  cn?: string;
  ip: string;
  latitude?: number;
  longitude?: number;
  range?: string;
  scope: string;
  value: string;
}

// Meta key-value pair
export interface MetaData {
  key: string;
  value: string;
}

// Event structure
export interface EventData {
  timestamp: string;
  meta: MetaData[];
}

export interface AlertAttributes {
  id: number;
  uuid: string;
  scenario: string;
  scenario_version: string;
  scenario_hash: string;
  message: string;
  capacity: number;
  leakspeed: string;
  simulated: boolean;
  remediation: boolean;
  events_count: number;
  machine_id: string;
  source: SourceInfo;
  labels: string[] | null;
  meta: MetaData[];
  events: EventData[];
  crowdsec_created_at: Date;
  start_at: Date;
  stop_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AlertCreationAttributes extends Optional<AlertAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Alert extends Model<AlertAttributes, AlertCreationAttributes> implements AlertAttributes {
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
  public source!: SourceInfo;
  public labels!: string[] | null;
  public meta!: MetaData[];
  public events!: EventData[];
  public crowdsec_created_at!: Date;
  public start_at!: Date;
  public stop_at!: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations will be set in models/index.ts
  public readonly decisions?: any[];
}

Alert.init(
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
