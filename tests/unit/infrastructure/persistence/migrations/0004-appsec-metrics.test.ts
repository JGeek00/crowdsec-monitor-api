import { describe, it, expect, vi } from 'vitest';

vi.mock('@/config/database', () => {
  const { Sequelize } = require('@sequelize/core');
  const { SqliteDialect } = require('@sequelize/sqlite3');
  const seq = new Sequelize({
    dialect: SqliteDialect,
    storage: ':memory:',
    logging: false,
    pool: { max: 1, min: 0, idle: Infinity, maxUses: Infinity },
  });
  return { sequelize: seq, initDatabase: vi.fn().mockResolvedValue(undefined) };
});

import migration from '@/infrastructure/persistence/sequelize/migrations/0004_add_appsec_and_metrics_history';

async function columnNames(seq: { query: (sql: string) => Promise<unknown> }, table: string): Promise<string[]> {
  const [rows] = (await seq.query(`PRAGMA table_info(${table})`)) as unknown as [Array<{ name: string }>, unknown];
  return rows.map((r) => r.name);
}

async function tableExists(seq: { query: (sql: string) => Promise<unknown> }, table: string): Promise<boolean> {
  const [rows] = (await seq.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`,
  )) as unknown as [Array<{ name: string }>, unknown];
  return rows.length === 1;
}

describe('migration 0004 (AppSec + dormant metrics history)', () => {
  it('adds AppSec columns, backfills pre-1.7.7 rows and creates metrics tables', async () => {
    const { sequelize } = await import('@/config/database');
    // Legacy shape: alerts without AppSec columns, as created before this migration.
    await sequelize.query('DROP TABLE IF EXISTS alerts');
    await sequelize.query('CREATE TABLE alerts (id INTEGER PRIMARY KEY, scenario VARCHAR(255))');
    await sequelize.query(
      `INSERT INTO alerts (id, scenario) VALUES (1, 'crowdsecurity/vpatch-env-access'), (2, 'crowdsecurity/ssh-bf')`,
    );

    await migration.up();

    const cols = await columnNames(sequelize, 'alerts');
    for (const col of ['is_appsec', 'appsec_rule', 'appsec_uri', 'appsec_host', 'appsec_method']) {
      expect(cols).toContain(col);
    }

    const [rows] = (await sequelize.query('SELECT id, is_appsec FROM alerts ORDER BY id')) as unknown as [
      Array<{ id: number; is_appsec: number }>,
      unknown,
    ];
    expect(rows.map((r) => ({ id: r.id, is_appsec: Boolean(r.is_appsec) }))).toEqual([
      { id: 1, is_appsec: true },
      { id: 2, is_appsec: false },
    ]);

    expect(await tableExists(sequelize, 'metrics_snapshots')).toBe(true);
    expect(await tableExists(sequelize, 'metrics_rollups')).toBe(true);

    // Re-running on an already-migrated DB is a no-op (production restarts).
    await expect(migration.up()).resolves.toBeUndefined();
  });

  it('down removes the metrics tables and AppSec columns', async () => {
    const { sequelize } = await import('@/config/database');
    await migration.down();

    const cols = await columnNames(sequelize, 'alerts');
    for (const col of ['is_appsec', 'appsec_rule', 'appsec_uri', 'appsec_host', 'appsec_method']) {
      expect(cols).not.toContain(col);
    }
    expect(await tableExists(sequelize, 'metrics_snapshots')).toBe(false);
    expect(await tableExists(sequelize, 'metrics_rollups')).toBe(false);
  });
});
