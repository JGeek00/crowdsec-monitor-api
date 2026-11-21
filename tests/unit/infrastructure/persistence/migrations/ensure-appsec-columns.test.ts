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

import {
  ensureAppsecColumns,
  APPSEC_ALTER_STATEMENTS,
} from '@/infrastructure/persistence/sequelize/migrations/ensure-appsec-columns';

async function columnNames(seq: { query: (sql: string) => Promise<unknown> }): Promise<string[]> {
  const [rows] = (await seq.query('PRAGMA table_info(alerts)')) as unknown as [Array<{ name: string }>, unknown];
  return rows.map((r) => r.name);
}

describe('ensureAppsecColumns', () => {
  it('adds the AppSec columns to a pre-0004 alerts table and is idempotent', async () => {
    const { sequelize } = await import('@/config/database');
    await sequelize.query('DROP TABLE IF EXISTS alerts');
    await sequelize.query('CREATE TABLE alerts (id INTEGER PRIMARY KEY, scenario VARCHAR(255))');

    await ensureAppsecColumns(sequelize as never);
    const cols = await columnNames(sequelize);
    for (const col of ['is_appsec', 'appsec_rule', 'appsec_uri', 'appsec_host', 'appsec_method', 'kind']) {
      expect(cols).toContain(col);
    }
    expect(APPSEC_ALTER_STATEMENTS).toHaveLength(6);

    await expect(ensureAppsecColumns(sequelize as never)).resolves.toBeUndefined();
  });

  it('ignores a missing alerts table (fresh installs create it via sync)', async () => {
    const { sequelize } = await import('@/config/database');
    await sequelize.query('DROP TABLE IF EXISTS alerts');

    await expect(ensureAppsecColumns(sequelize as never)).resolves.toBeUndefined();
  });
});
