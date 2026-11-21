import type { Sequelize } from '@sequelize/core';

/** Column definitions added to `alerts` by migration 0004 (AppSec support). */
export const APPSEC_ALTER_STATEMENTS = [
  'ALTER TABLE alerts ADD COLUMN is_appsec BOOLEAN DEFAULT FALSE',
  'ALTER TABLE alerts ADD COLUMN appsec_rule VARCHAR(255)',
  'ALTER TABLE alerts ADD COLUMN appsec_uri VARCHAR(1024)',
  'ALTER TABLE alerts ADD COLUMN appsec_host VARCHAR(255)',
  'ALTER TABLE alerts ADD COLUMN appsec_method VARCHAR(16)',
] as const;

/**
 * Ensures the AppSec columns exist before model sync.
 * `sequelize.sync()` never alters existing tables but does create the model's
 * declared indexes, so on pre-0004 databases the columns must exist first.
 * Idempotent: a missing table (fresh installs, sync creates it with columns)
 * and duplicate columns are ignored.
 */
export async function ensureAppsecColumns(sequelize: Sequelize): Promise<void> {
  for (const sql of APPSEC_ALTER_STATEMENTS) {
    await sequelize.query(sql).catch(() => {
      /* table missing or column already exists — safe to ignore */
    });
  }
}
