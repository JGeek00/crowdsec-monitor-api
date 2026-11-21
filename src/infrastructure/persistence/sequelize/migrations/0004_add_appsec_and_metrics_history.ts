import { sequelize } from '@/config/database';
import { ensureAppsecColumns } from './ensure-appsec-columns';

/**
 * Migration 0004: AppSec (waf + bot-detection) + dormant metrics history.
 *
 * - alerts: is_appsec + appsec_rule/uri/host/method (raw kind persisted since 0005).
 * - metrics_snapshots + metrics_rollups: created empty, job disabled by flag.
 * - historic backfill by scenario (pre-1.7.7 rows carry no `kind`).
 */

export default {
  name: '0004_add_appsec_and_metrics_history',
  up: async () => {
    await ensureAppsecColumns(sequelize);

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
