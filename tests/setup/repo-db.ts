import { vi } from 'vitest';

/**
 * In-memory SQLite database for repository unit tests.
 * Mocks '@/config/database' so repositories and models share one instance,
 * mirroring the setup-app approach but without booting the express app.
 */
const sequelizeRef = vi.hoisted(() => ({ current: null as any }));

vi.mock('@/config/database', () => {
  const { Sequelize } = require('@sequelize/core');
  const { SqliteDialect } = require('@sequelize/sqlite3');
  const seq = new Sequelize({
    dialect: SqliteDialect,
    storage: ':memory:',
    logging: false,
    // In-memory DB: Sequelize v7 requires a 1-connection pool that is never recycled.
    pool: { max: 1, min: 0, idle: Infinity, maxUses: Infinity },
    define: {
      timestamps: true,
      underscored: true,
    },
  });
  sequelizeRef.current = seq;
  return {
    sequelize: seq,
    initDatabase: vi.fn().mockResolvedValue(undefined),
  };
});

/** Imports the models (registering associations) and syncs all tables. */
export async function initRepoDb(): Promise<void> {
  await import('@/infrastructure/persistence/sequelize/models');
  await sequelizeRef.current.sync();
}

export function getRepoSequelize(): any {
  return sequelizeRef.current;
}

/** Deletes every row between tests (order respects FKs). */
export async function cleanRepoDb(): Promise<void> {
  const seq = sequelizeRef.current;
  await seq.query('DELETE FROM decisions');
  await seq.query('DELETE FROM blocklist_ips');
  await seq.query('DELETE FROM blocklists');
  await seq.query('DELETE FROM cs_blocklists');
  await seq.query('DELETE FROM notification_channels');
  await seq.query('DELETE FROM notifications');
  await seq.query('DELETE FROM alerts');
}

export async function closeRepoDb(): Promise<void> {
  await sequelizeRef.current?.close();
}
