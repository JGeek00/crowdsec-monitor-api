import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

const mockMigration = vi.hoisted(() => ({
  ensureInitialized: vi.fn(),
  sync: vi.fn(),
  findOne: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
}));

const mockSequelize = vi.hoisted(() => ({
  query: vi.fn(),
}));

const mockLog = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

// fs is a CJS module — default export IS the module
vi.mock('fs', () => ({
  default: mockFs,
  ...mockFs,
}));
vi.mock('@/services/log.service', () => ({ log: mockLog }));
vi.mock('@/models/db/Migration', () => ({ Migration: mockMigration }));

describe('MigrationRunner', () => {
  let MigrationRunner: typeof import('@/services/migrations/migration-runner.service').MigrationRunner;
  let runner: InstanceType<typeof MigrationRunner>;
  let mockMigrationService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.doMock('@/config/index', () => ({
      config: { database: { mode: 'sqlite' } },
    }));
    vi.doMock('@/config/database', () => ({
      sequelize: mockSequelize,
    }));

    const mod = await import('@/services/migrations/migration-runner.service');
    MigrationRunner = mod.MigrationRunner;

    mockMigrationService = {
      isMigrationApplied: vi.fn(),
      registerMigration: vi.fn(),
      getAppliedMigrations: vi.fn(),
      getPendingMigrations: vi.fn(),
    };
    runner = new MigrationRunner(mockMigrationService as any);
    (runner as any).migrationsDir = '/migrations';
  });

  describe('getMigrationName', () => {
    it('strips .js extension', () => {
      const name = (runner as any).getMigrationName('001_test.js');
      expect(name).toBe('001_test');
    });
  });

  describe('loadMigrations', () => {
    it('returns empty array when directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = (runner as any).loadMigrations();
      expect(result).toEqual([]);
      expect(mockLog.warn).toHaveBeenCalled();
    });

    it('returns sorted migration names', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['002_second.js', '001_first.js', '003_third.js', 'readme.txt']);
      // Pre-populate cache so loadMigration require() isn't called
      (runner as any).migrationsCache.set('001_first', { up: vi.fn() });
      (runner as any).migrationsCache.set('002_second', { up: vi.fn() });
      (runner as any).migrationsCache.set('003_third', { up: vi.fn() });

      const result = (runner as any).loadMigrations();
      expect(result).toEqual(['001_first', '002_second', '003_third']);
    });

    it('returns all matching names even if loading fails', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_good.js', '002_bad.js']);
      // loadMigrations will try to require() each module — since the file doesn't exist
      // on disk, the require will fail and the error is logged. The result still includes
      // all names matching the numeric prefix pattern.
      const result = (runner as any).loadMigrations();
      expect(result).toEqual(['001_good', '002_bad']);
    });
  });

  describe('ensureMigrationsTable', () => {
    it('calls Migration.ensureInitialized and sync', async () => {
      await (runner as any).ensureMigrationsTable();
      expect(mockMigration.ensureInitialized).toHaveBeenCalled();
      expect(mockMigration.sync).toHaveBeenCalledWith({ force: false });
    });
  });

  describe('migrationsTableExists', () => {
    it('returns true for SQLite when table exists', async () => {
      mockSequelize.query.mockResolvedValue([[{ name: 'migrations' }]]);
      const result = await (runner as any).migrationsTableExists();
      expect(result).toBe(true);
    });

    it('returns false for SQLite when table does not exist', async () => {
      mockSequelize.query.mockResolvedValue([[]]);
      const result = await (runner as any).migrationsTableExists();
      expect(result).toBe(false);
    });
  });

  describe('executeMigration', () => {
    it('executes migration and registers it', async () => {
      const upMock = vi.fn().mockResolvedValue(undefined);
      (runner as any).migrationsCache.set('001_test', { up: upMock });

      await (runner as any).executeMigration('001_test');
      expect(upMock).toHaveBeenCalledWith({});
      expect(mockMigrationService.registerMigration).toHaveBeenCalledWith('001_test');
    });

    it('throws when migration not in cache', async () => {
      await expect((runner as any).executeMigration('missing')).rejects.toThrow('Migration not found: missing');
    });

    it('logs and re-throws when migration up() fails', async () => {
      const upMock = vi.fn().mockRejectedValue(new Error('up failed'));
      (runner as any).migrationsCache.set('001_bad', { up: upMock });

      await expect((runner as any).executeMigration('001_bad')).rejects.toThrow('up failed');
      expect(mockLog.error).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('logs and returns when no migrations found', async () => {
      mockFs.existsSync.mockReturnValue(false);
      await runner.run();
      expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('No migrations found'));
    });

    it('runs migrations from scratch when table does not exist', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_first.js']);
      (runner as any).migrationsCache.set('001_first', { up: vi.fn().mockResolvedValue(undefined) });
      mockMigrationService.getPendingMigrations.mockResolvedValue(['001_first']);
      mockSequelize.query.mockResolvedValue([[]]);

      await runner.run();

      expect(mockMigration.ensureInitialized).toHaveBeenCalled();
      expect(mockMigration.sync).toHaveBeenCalledWith({ force: false });
      expect(mockMigrationService.getPendingMigrations).toHaveBeenCalled();
    });

    it('registers all migrations as applied on fresh database', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_first.js', '002_second.js']);
      (runner as any).migrationsCache.set('001_first', { up: vi.fn() });
      (runner as any).migrationsCache.set('002_second', { up: vi.fn() });
      mockMigrationService.getAppliedMigrations.mockResolvedValue([]);
      mockSequelize.query.mockResolvedValue([[{ name: 'migrations' }]]);
      mockMigration.ensureInitialized.mockResolvedValue(undefined);
      mockMigration.sync.mockResolvedValue(undefined);

      await runner.run();

      expect(mockMigrationService.registerMigration).toHaveBeenCalledTimes(2);
      expect(mockMigrationService.registerMigration).toHaveBeenCalledWith('001_first');
      expect(mockMigrationService.registerMigration).toHaveBeenCalledWith('002_second');
    });

    it('runs only pending migrations when table exists with applied', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_first.js', '002_second.js']);
      (runner as any).migrationsCache.set('001_first', { up: vi.fn().mockResolvedValue(undefined) });
      (runner as any).migrationsCache.set('002_second', { up: vi.fn().mockResolvedValue(undefined) });
      mockMigrationService.getAppliedMigrations.mockResolvedValue(['001_first']);
      mockMigrationService.getPendingMigrations.mockResolvedValue(['002_second']);
      mockSequelize.query.mockResolvedValue([[{ name: 'migrations' }]]);

      await runner.run();

      expect(mockMigrationService.registerMigration).toHaveBeenCalledTimes(1);
      expect(mockMigrationService.registerMigration).toHaveBeenCalledWith('002_second');
    });

    it('does nothing when all migrations are up to date', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_first.js']);
      (runner as any).migrationsCache.set('001_first', { up: vi.fn() });
      mockMigrationService.getAppliedMigrations.mockResolvedValue(['001_first']);
      mockMigrationService.getPendingMigrations.mockResolvedValue([]);
      mockSequelize.query.mockResolvedValue([[{ name: 'migrations' }]]);

      await runner.run();

      expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('All migrations are up to date'));
      expect(mockMigrationService.registerMigration).not.toHaveBeenCalled();
    });

    it('re-throws error on migration failure', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_fail.js']);
      (runner as any).migrationsCache.set('001_fail', { up: vi.fn().mockRejectedValue(new Error('migration error')) });
      // Must have at least one already-applied migration so we skip the "fresh DB" branch
      mockMigrationService.getAppliedMigrations.mockResolvedValue(['000_previous']);
      mockMigrationService.getPendingMigrations.mockResolvedValue(['001_fail']);
      mockSequelize.query.mockResolvedValue([[{ name: 'migrations' }]]);

      await expect(runner.run()).rejects.toThrow('migration error');
      expect(mockLog.error).toHaveBeenCalled();
    });
  });
});
