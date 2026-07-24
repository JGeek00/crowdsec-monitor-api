import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/services/migrations/migration.service', () => ({
  MigrationService: vi.fn().mockImplementation(() => ({
    isMigrationApplied: vi.fn(),
    registerMigration: vi.fn(),
    getAppliedMigrations: vi.fn(),
    getPendingMigrations: vi.fn(),
  })),
}));

vi.mock('@/services/migrations/migration-runner.service', () => ({
  MigrationRunner: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('database config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('sequelize is an instance of Sequelize', async () => {
    const { sequelize } = await import('@/config/database');
    const { Sequelize } = await import('sequelize');
    expect(sequelize).toBeInstanceOf(Sequelize);
  });

  it('initDatabase calls authenticate and sync for SQLite', async () => {
    const { sequelize } = await import('@/config/database');
    vi.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
    vi.spyOn(sequelize, 'query').mockResolvedValue([[], [] as any]);
    vi.spyOn(sequelize, 'sync').mockResolvedValue(undefined as any);

    const { initDatabase } = await import('@/config/database');
    await initDatabase();

    expect(sequelize.authenticate).toHaveBeenCalled();
    expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('PRAGMA'));
    expect(sequelize.sync).toHaveBeenCalled();
  });

  it('initDatabase handles authenticate failure', async () => {
    const { sequelize } = await import('@/config/database');
    vi.spyOn(sequelize, 'authenticate').mockRejectedValue(new Error('connection failed'));

    const { initDatabase } = await import('@/config/database');
    await expect(initDatabase()).rejects.toThrow('connection failed');
  });

  it('initDatabase handles SQLite old lists migration', async () => {
    const { sequelize } = await import('@/config/database');
    vi.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
    // Return a result with old 'lists' table
    vi.spyOn(sequelize, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("name='lists'")) return [[{ name: 'lists' }]];
      if (sql.includes('ALTER TABLE')) throw new Error('column already exists');
      return [[], [] as any];
    });
    vi.spyOn(sequelize, 'sync').mockResolvedValue(undefined as any);

    const { initDatabase } = await import('@/config/database');
    await expect(initDatabase()).resolves.toBeUndefined();
  });

  it('initDatabase initializes Postgres', async () => {
    process.env.DB_MODE = 'postgres';
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_USER = 'u';
    process.env.POSTGRES_PASSWORD = 'p';
    process.env.POSTGRES_DB = 'd';

    // Re-import with postgres env
    const { sequelize } = await import('@/config/database');
    vi.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
    vi.spyOn(sequelize, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("tablename='lists'")) return [[{ tablename: 'lists' }]];
      if (sql.includes('ALTER TABLE')) throw new Error('already exists');
      return [[], [] as any];
    });
    vi.spyOn(sequelize, 'sync').mockResolvedValue(undefined as any);

    const { initDatabase } = await import('@/config/database');
    await expect(initDatabase()).resolves.toBeUndefined();
  });

  it('initDatabase handles Postgres without old lists', async () => {
    process.env.DB_MODE = 'postgres';
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_USER = 'u';
    process.env.POSTGRES_PASSWORD = 'p';
    process.env.POSTGRES_DB = 'd';

    const { sequelize } = await import('@/config/database');
    vi.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
    vi.spyOn(sequelize, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("tablename='lists'")) return [[]];
      if (sql.includes('ALTER TABLE')) throw new Error('already exists');
      return [[], [] as any];
    });
    vi.spyOn(sequelize, 'sync').mockResolvedValue(undefined as any);

    const { initDatabase } = await import('@/config/database');
    await expect(initDatabase()).resolves.toBeUndefined();
  });
});
