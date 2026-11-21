import { DataTypes, Model } from '@sequelize/core';
import { sequelize } from '@/config/database';

class MetricsSnapshotsTable extends Model {
  public id!: number;
  public captured_at!: Date;
  public source!: string;
  public payload!: Record<string, unknown>;

  static readonly col = {
    id: 'id',
    capturedAt: 'captured_at',
    source: 'source',
    payload: 'payload',
  } as const;
}

MetricsSnapshotsTable.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    captured_at: { type: DataTypes.DATE, allowNull: false },
    source: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'crowdsec-prometheus' },
    payload: { type: DataTypes.JSON, allowNull: false },
  },
  {
    sequelize,
    tableName: 'metrics_snapshots',
    underscored: true,
    timestamps: false,
    indexes: [{ name: 'idx_metrics_snapshots_captured_at', fields: ['captured_at'] }],
  },
);

export default MetricsSnapshotsTable;
