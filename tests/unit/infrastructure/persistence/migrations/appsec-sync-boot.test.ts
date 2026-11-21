import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { closeRepoDb, getRepoSequelize, initRepoDb } from '@tests/setup/repo-db';
import AlertsTable from '@/infrastructure/persistence/sequelize/models/Alerts';
import { ensureAppsecColumns } from '@/infrastructure/persistence/sequelize/migrations/ensure-appsec-columns';

/**
 * Regression test for the boot failure on pre-0004 databases:
 * model sync() creates the declared indexes, so without the AppSec columns
 * it fails with `SQLITE_ERROR: no such column: is_appsec` (initSQLite order:
 * sync() runs before the migration runner).
 */
describe('AppSec boot regression (sync before migrations)', () => {
  beforeAll(async () => {
    await initRepoDb();
  });
  afterAll(async () => {
    await closeRepoDb();
  });

  it('model sync fails on a pre-0004 alerts table until columns are ensured', async () => {
    const seq = getRepoSequelize();
    // Faithful pre-0004 shape: full table minus the five AppSec columns.
    await seq.query('DROP INDEX IF EXISTS idx_alerts_is_appsec');
    await seq.query('DROP INDEX IF EXISTS idx_alerts_appsec_rule');
    for (const col of ['is_appsec', 'appsec_rule', 'appsec_uri', 'appsec_host', 'appsec_method']) {
      await seq.query(`ALTER TABLE alerts DROP COLUMN ${col}`);
    }

    await expect(AlertsTable.sync()).rejects.toThrow(/no such column: is_appsec/);

    await ensureAppsecColumns(seq);
    await AlertsTable.sync();

    const [rows] = (await seq.query('PRAGMA table_info(alerts)')) as unknown as [Array<{ name: string }>, unknown];
    const cols = rows.map((r) => r.name);
    for (const col of ['is_appsec', 'appsec_rule', 'appsec_uri', 'appsec_host', 'appsec_method']) {
      expect(cols).toContain(col);
    }
  });
});
