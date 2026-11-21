import { DataTypes, Model } from '@sequelize/core';
import { sequelize } from '@/config/database';

// Dormida: creada por la migración 0004, sin writer hasta activar METRICS_HISTORY_ENABLED.
class MetricsRollupsTable extends Model {
  public id!: number;
  public bucket_start!: Date;
  public resolution!: string;
  public series!: string;
  public labels!: Record<string, unknown> | null;
  public sum!: number | null;
  public min!: number | null;
  public max!: number | null;

  static readonly col = {
    id: 'id',
    bucketStart: 'bucket_start',
    resolution: 'resolution',
    series: 'series',
    labels: 'labels',
    sum: 'sum',
    min: 'min',
    max: 'max',
  } as const;
}

MetricsRollupsTable.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bucket_start: { type: DataTypes.DATE, allowNull: false },
    resolution: { type: DataTypes.STRING(16), allowNull: false },
    series: { type: DataTypes.STRING(128), allowNull: false },
    labels: { type: DataTypes.JSON, allowNull: true },
    sum: { type: DataTypes.DOUBLE, allowNull: true },
    min: { type: DataTypes.DOUBLE, allowNull: true },
    max: { type: DataTypes.DOUBLE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'metrics_rollups',
    underscored: true,
    timestamps: false,
    indexes: [{ name: 'idx_metrics_rollups_series_bucket', fields: ['series', 'bucket_start'] }],
  },
);

export default MetricsRollupsTable;
