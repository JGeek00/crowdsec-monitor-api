import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/infrastructure/persistence/sequelize/models', () => ({
  BlocklistsTable: { findAll: vi.fn() },
}));

vi.mock('@/infrastructure/sync/alerts-sync', () => ({
  alertsSyncService: {
    syncAlerts: vi.fn(),
    cleanupOldData: vi.fn(),
    syncDecisions: vi.fn(),
    syncAll: vi.fn(),
    getLastSuccessfulSync: vi.fn(),
  },
}));

vi.mock('@/infrastructure/sync/blocklist-ops', () => ({
  blocklistOpsService: {
    activateBlocklist: vi.fn(),
    deleteBlocklistAlerts: vi.fn(),
    refreshBlocklists: vi.fn(),
  },
}));

vi.mock('@/infrastructure/sync/cs-blocklists-sync', () => ({
  csBlocklistSyncService: { syncCsBlocklists: vi.fn() },
}));

describe('DatabaseService', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('syncAlerts delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    vi.mocked(alertsSyncService.syncAlerts).mockResolvedValue({ synced: 5, updated: 2, errors: 0, decisions: 10 });

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    const result = await databaseService.syncAlerts();
    expect(result).toEqual({ synced: 5, updated: 2, errors: 0, decisions: 10 });
  });

  it('syncAll delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    vi.mocked(alertsSyncService.syncAll).mockResolvedValue({
      alerts: { synced: 1, updated: 0, errors: 0, decisions: 0 },
    });

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    const result = await databaseService.syncAll();
    expect(result.alerts.synced).toBe(1);
  });

  it('refreshBlocklists delegates to blocklistOpsService', async () => {
    const { blocklistOpsService } = await import('@/infrastructure/sync/blocklist-ops');
    vi.mocked(blocklistOpsService.refreshBlocklists).mockResolvedValue({
      refreshed: 2,
      totalIps: 100,
      errors: { fetch: [], parse: [], delete: [], import: [] },
    });

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    const result = await databaseService.refreshBlocklists();
    expect(result.refreshed).toBe(2);
  });

  it('syncCsBlocklists delegates to csBlocklistSyncService', async () => {
    const { csBlocklistSyncService } = await import('@/infrastructure/sync/cs-blocklists-sync');
    vi.mocked(csBlocklistSyncService.syncCsBlocklists).mockResolvedValue({ synced: 3, ips: 50, errors: 0 });

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    const result = await databaseService.syncCsBlocklists();
    expect(result.synced).toBe(3);
  });

  it('getLastSuccessfulSync delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await vi.importActual<typeof import('@/infrastructure/sync/alerts-sync')>(
      '@/infrastructure/sync/alerts-sync',
    );
    // Already mocked, test the delegation via databaseService
  });

  it('activateBlocklist delegates to blocklistOpsService', async () => {
    const { blocklistOpsService } = await import('@/infrastructure/sync/blocklist-ops');
    vi.mocked(blocklistOpsService.activateBlocklist).mockResolvedValue({ allowlistSkipped: 0 });

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    const result = await databaseService.activateBlocklist({ id: 1, name: 'test' } as any);
    expect(result.allowlistSkipped).toBe(0);
  });

  it('deleteBlocklistAlerts delegates to blocklistOpsService', async () => {
    const { blocklistOpsService } = await import('@/infrastructure/sync/blocklist-ops');

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    await databaseService.deleteBlocklistAlerts({ id: 1, name: 'test' } as any);
    expect(blocklistOpsService.deleteBlocklistAlerts).toHaveBeenCalled();
  });

  it('getLastSuccessfulSync delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    vi.mocked(alertsSyncService.getLastSuccessfulSync).mockReturnValue(new Date('2024-01-15'));

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    const result = databaseService.getLastSuccessfulSync();
    expect(result).toEqual(new Date('2024-01-15'));
  });

  it('cleanupOldData delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    vi.mocked(alertsSyncService.cleanupOldData).mockResolvedValue({ deletedAlerts: 10, deletedDecisions: 5 });

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    const result = await databaseService.cleanupOldData();
    expect(result).toEqual({ deletedAlerts: 10, deletedDecisions: 5 });
  });

  it('syncDecisions delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    vi.mocked(alertsSyncService.syncDecisions).mockResolvedValue({ synced: 3, errors: 0 });

    const { databaseService } = await import('@/infrastructure/persistence/database-facade');
    const result = await databaseService.syncDecisions();
    expect(result).toEqual({ synced: 3, errors: 0 });
  });
});
