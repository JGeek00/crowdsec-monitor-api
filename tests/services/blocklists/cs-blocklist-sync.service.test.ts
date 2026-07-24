import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models', () => ({
  CsBlocklistsTable: { destroy: vi.fn(), create: vi.fn() },
  BLOCKLIST_IP_ORIGIN: { CS_BLOCKLIST: 'cs_blocklist' },
  BlocklistIpsTable: { bulkCreate: vi.fn() },
}));

vi.mock('@/config/database', () => ({
  sequelize: { transaction: vi.fn() },
}));

vi.mock('@/services/crowdsec-api.service', () => ({
  crowdSecAPI: { alerts: { getAlerts: vi.fn() } },
}));

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('CsBlocklistSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncCsBlocklists processes alerts with origin=lists', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      { id: 1, source: { scope: 'list-1' }, decisions: [{ value: '1.2.3.4', scenario: 'test' }] },
    ] as any);

    const { sequelize } = await import('@/config/database');
    vi.mocked(sequelize.transaction).mockImplementation(async (cb: any) => cb({}));

    const { CsBlocklistsTable, BlocklistIpsTable } = await import('@/models');
    vi.mocked(CsBlocklistsTable.destroy).mockResolvedValue(0);
    vi.mocked(CsBlocklistsTable.create).mockResolvedValue({} as any);
    vi.mocked(BlocklistIpsTable.bulkCreate).mockResolvedValue([] as any);

    const { csBlocklistSyncService } = await import('@/services/blocklists/cs-blocklist-sync.service');
    const result = await csBlocklistSyncService.syncCsBlocklists();

    expect(result.synced).toBe(1);
    expect(result.ips).toBe(1);
  });

  it('syncCsBlocklists returns empty when no alerts', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([]);

    const { csBlocklistSyncService } = await import('@/services/blocklists/cs-blocklist-sync.service');
    const result = await csBlocklistSyncService.syncCsBlocklists();

    expect(result.synced).toBe(0);
    expect(result.ips).toBe(0);
  });

  it('syncCsBlocklists deduplicates by name keeping highest id', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      { id: 1, source: { scope: 'list-a' }, decisions: [{ value: '1.1.1.1' }] },
      { id: 2, source: { scope: 'list-a' }, decisions: [{ value: '2.2.2.2' }] },
      { id: 3, source: { scope: 'list-b' }, decisions: [{ value: '3.3.3.3' }] },
    ] as any);

    const { sequelize } = await import('@/config/database');
    vi.mocked(sequelize.transaction).mockImplementation(async (cb: any) => cb({}));

    const { CsBlocklistsTable, BlocklistIpsTable } = await import('@/models');
    vi.mocked(CsBlocklistsTable.destroy).mockResolvedValue(0);
    vi.mocked(CsBlocklistsTable.create).mockResolvedValue({} as any);
    vi.mocked(BlocklistIpsTable.bulkCreate).mockResolvedValue([] as any);

    const { csBlocklistSyncService } = await import('@/services/blocklists/cs-blocklist-sync.service');
    const result = await csBlocklistSyncService.syncCsBlocklists();

    expect(result.synced).toBe(2);
  });
});
