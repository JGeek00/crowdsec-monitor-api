import { describe, it, expect, vi } from 'vitest';

const mockFindOne = vi.fn();
const mockFindAll = vi.fn();
const mockCreate = vi.fn();
const mockEnsureInitialized = vi.fn();

vi.mock('@/models/db/Migration', () => ({
  Migration: {
    ensureInitialized: mockEnsureInitialized,
    findOne: mockFindOne,
    findAll: mockFindAll,
    create: mockCreate,
  },
}));

describe('MigrationService', () => {
  it('isMigrationApplied returns true when found', async () => {
    mockFindOne.mockResolvedValue({ name: '001_test' });
    const { MigrationService } = await import('@/services/migrations/migration.service');
    const svc = new MigrationService();
    const result = await svc.isMigrationApplied('001_test');
    expect(result).toBe(true);
  });

  it('isMigrationApplied returns false when not found', async () => {
    mockFindOne.mockResolvedValue(null);
    const { MigrationService } = await import('@/services/migrations/migration.service');
    const svc = new MigrationService();
    const result = await svc.isMigrationApplied('001_test');
    expect(result).toBe(false);
  });

  it('registerMigration creates a migration record', async () => {
    mockCreate.mockResolvedValue({} as any);
    const { MigrationService } = await import('@/services/migrations/migration.service');
    const svc = new MigrationService();
    await svc.registerMigration('001_test');
    expect(mockCreate).toHaveBeenCalledWith({
      name: '001_test',
      applied_at: expect.any(Date),
    });
  });

  it('getAppliedMigrations returns all names', async () => {
    mockFindAll.mockResolvedValue([{ name: '001_a' }, { name: '002_b' }]);
    const { MigrationService } = await import('@/services/migrations/migration.service');
    const svc = new MigrationService();
    const result = await svc.getAppliedMigrations();
    expect(result).toEqual(['001_a', '002_b']);
  });

  it('getPendingMigrations filters out applied ones', async () => {
    mockFindAll.mockResolvedValue([{ name: '001_a' }]);
    const { MigrationService } = await import('@/services/migrations/migration.service');
    const svc = new MigrationService();
    const result = await svc.getPendingMigrations(['001_a', '002_b', '003_c']);
    expect(result).toEqual(['002_b', '003_c']);
  });
});
