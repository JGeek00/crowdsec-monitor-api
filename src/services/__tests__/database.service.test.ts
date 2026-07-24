import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/models', () => ({
  BlocklistsTable: { findAll: vi.fn() },
}));

vi.mock('@/services/alerts-sync.service', () => ({
  alertsSyncService: {
    syncAlerts: vi.fn(),
    cleanupOldData: vi.fn(),
    syncDecisions: vi.fn(),
    syncAll: vi.fn(),
    getLastSuccessfulSync: vi.fn(),
  },
}));

vi.mock('@/services/blocklists/blocklist-ops.service', () => ({
  blocklistOpsService: {
    activateBlocklist: vi.fn(),
    deleteBlocklistAlerts: vi.fn(),
    refreshBlocklists: vi.fn(),
  },
}));

vi.mock('@/services/blocklists/cs-blocklist-sync.service', () => ({
  csBlocklistSyncService: { syncCsBlocklists: vi.fn() },
}));

describe('DatabaseService', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('syncAlerts delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    vi.mocked(alertsSyncService.syncAlerts).mockResolvedValue({ synced: 5, updated: 2, errors: 0, decisions: 10 });

    const { databaseService } = await import('@/services/database.service');
    const result = await databaseService.syncAlerts();
    expect(result).toEqual({ synced: 5, updated: 2, errors: 0, decisions: 10 });
  });

  it('syncAll delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    vi.mocked(alertsSyncService.syncAll).mockResolvedValue({
      alerts: { synced: 1, updated: 0, errors: 0, decisions: 0 },
    });

    const { databaseService } = await import('@/services/database.service');
    const result = await databaseService.syncAll();
    expect(result.alerts.synced).toBe(1);
  });

  it('refreshBlocklists delegates to blocklistOpsService', async () => {
    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    vi.mocked(blocklistOpsService.refreshBlocklists).mockResolvedValue({
      refreshed: 2,
      totalIps: 100,
      errors: { fetch: [], parse: [], delete: [], import: [] },
    });

    const { databaseService } = await import('@/services/database.service');
    const result = await databaseService.refreshBlocklists();
    expect(result.refreshed).toBe(2);
  });

  it('syncCsBlocklists delegates to csBlocklistSyncService', async () => {
    const { csBlocklistSyncService } = await import('@/services/blocklists/cs-blocklist-sync.service');
    vi.mocked(csBlocklistSyncService.syncCsBlocklists).mockResolvedValue({ synced: 3, ips: 50, errors: 0 });

    const { databaseService } = await import('@/services/database.service');
    const result = await databaseService.syncCsBlocklists();
    expect(result.synced).toBe(3);
  });

  it('getLastSuccessfulSync delegates to alertsSyncService', () => {
    const { alertsSyncService } = vi.importActual('@/services/alerts-sync.service');
    // Already mocked, test the delegation via databaseService
  });

  it('activateBlocklist delegates to blocklistOpsService', async () => {
    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    vi.mocked(blocklistOpsService.activateBlocklist).mockResolvedValue({ allowlistSkipped: 0 });

    const { databaseService } = await import('@/services/database.service');
    const result = await databaseService.activateBlocklist({ id: 1, name: 'test' } as any);
    expect(result.allowlistSkipped).toBe(0);
  });

  it('deleteBlocklistAlerts delegates to blocklistOpsService', async () => {
    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');

    const { databaseService } = await import('@/services/database.service');
    await databaseService.deleteBlocklistAlerts({ id: 1, name: 'test' } as any);
    expect(blocklistOpsService.deleteBlocklistAlerts).toHaveBeenCalled();
  });

  it('getLastSuccessfulSync delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    vi.mocked(alertsSyncService.getLastSuccessfulSync).mockReturnValue(new Date('2024-01-15'));

    const { databaseService } = await import('@/services/database.service');
    const result = databaseService.getLastSuccessfulSync();
    expect(result).toEqual(new Date('2024-01-15'));
  });

  it('cleanupOldData delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    vi.mocked(alertsSyncService.cleanupOldData).mockResolvedValue({ deleted: 10 });

    const { databaseService } = await import('@/services/database.service');
    const result = await databaseService.cleanupOldData();
    expect(result).toEqual({ deleted: 10 });
  });

  it('syncDecisions delegates to alertsSyncService', async () => {
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    vi.mocked(alertsSyncService.syncDecisions).mockResolvedValue({ synced: 3, errors: 0 });

    const { databaseService } = await import('@/services/database.service');
    const result = await databaseService.syncDecisions();
    expect(result).toEqual({ synced: 3, errors: 0 });
  });
});
