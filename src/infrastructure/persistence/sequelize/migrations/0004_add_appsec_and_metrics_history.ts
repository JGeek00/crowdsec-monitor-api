import { sequelize } from '@/config/database';

/**
 * Migration 0004: AppSec (waf + bot-detection) + dormant metrics history.
 *
 * - alerts: is_appsec + appsec_rule/uri/host/method (raw kind is not persisted).
 * - metrics_snapshots + metrics_rollups: created empty, job disabled by flag.
 * - historic backfill by scenario (pre-1.7.7 rows carry no `kind`).
 */

const ADD_COLUMNS = [
  'ALTER TABLE alerts ADD COLUMN is_appsec BOOLEAN DEFAULT FALSE',
  'ALTER TABLE alerts ADD COLUMN appsec_rule VARCHAR(255)',
  'ALTER TABLE alerts ADD COLUMN appsec_uri VARCHAR(1024)',
  'ALTER TABLE alerts ADD COLUMN appsec_host VARCHAR(255)',
  'ALTER TABLE alerts ADD COLUMN appsec_method VARCHAR(16)',
] as const;

function isDuplicateColumn(error: unknown): boolean {
  const err = error as {
    parent?: { errno?: number; code?: string; message?: string };
    message?: string;
    code?: string;
  };
  return (
    (err?.parent?.errno === 1 && err?.parent?.message?.includes('duplicate column name')) ||
    err?.message?.includes('duplicate column name') ||
    err?.message?.includes('already exists') ||
    err?.parent?.code === '42701' ||
    err?.code === 'SQLITE_ERROR'
  );
}

export default {
  name: '0004_add_appsec_and_metrics_history',
  up: async () => {
    for (const sql of ADD_COLUMNS) {
      try {
        await sequelize.query(sql);
      } catch (error) {
        if (isDuplicateColumn(error)) {
          console.log(`Columna ya existe - saltando: ${sql}`);
          continue;
        }
        throw error;
      }
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS metrics_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        captured_at DATETIME NOT NULL,
        source VARCHAR(64) NOT NULL DEFAULT 'crowdsec-prometheus',
        payload JSON NOT NULL
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS metrics_rollups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bucket_start DATETIME NOT NULL,
        resolution VARCHAR(16) NOT NULL,
        series VARCHAR(128) NOT NULL,
        labels JSON,
        sum DOUBLE PRECISION,
        min DOUBLE PRECISION,
        max DOUBLE PRECISION
      )
    `);

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_captured_at ON metrics_snapshots (captured_at)`,
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_metrics_rollups_series_bucket ON metrics_rollups (series, bucket_start)`,
    );
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_alerts_is_appsec ON alerts (is_appsec)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_alerts_appsec_rule ON alerts (appsec_rule)`);

    // Backfill pre-1.7.7 rows (no `kind` in LAPI): everything appsec/vpatch is AppSec.
    await sequelize.query(`
      UPDATE alerts SET is_appsec = TRUE
      WHERE LOWER(scenario) LIKE '%appsec%' OR LOWER(scenario) LIKE '%vpatch%'
    `);
  },
  down: async () => {
    await sequelize.query('DROP TABLE IF EXISTS metrics_rollups').catch(() => {});
    await sequelize.query('DROP TABLE IF EXISTS metrics_snapshots').catch(() => {});
    // SQLite/Postgres refuse to drop an indexed column: drop our indexes first.
    for (const idx of ['idx_alerts_is_appsec', 'idx_alerts_appsec_rule']) {
      await sequelize.query(`DROP INDEX IF EXISTS ${idx}`).catch(() => {});
    }
    for (const col of ['is_appsec', 'appsec_rule', 'appsec_uri', 'appsec_host', 'appsec_method']) {
      await sequelize.query(`ALTER TABLE alerts DROP COLUMN ${col}`).catch(() => {});
    }
  },
};
