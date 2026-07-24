import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models', () => ({
  BlocklistsTable: { findAll: vi.fn() },
  BlocklistIpsTable: { create: vi.fn(), bulkCreate: vi.fn() },
}));

vi.mock('@/config/database', () => ({
  sequelize: { query: vi.fn(), transaction: vi.fn() },
}));

vi.mock('@/config', () => ({
  config: {
    database: { mode: 'sqlite' },
    blocklists: { writeChunkSize: 1000 },
    blocklistBanDuration: '24h',
    processes: { finishedRetentionMs: 3600000 },
  },
  defaults: { blocklists: { writeChunkSize: 1000 } },
}));

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/services/crowdsec-api.service', () => ({
  crowdSecAPI: {
    decisions: { getActiveDecisions: vi.fn() },
    alerts: { createAlerts: vi.fn() },
    allowlists: { getAllowlists: vi.fn() },
    setBouncerConnected: vi.fn(),
  },
}));

vi.mock('@/services/status.service', () => ({
  statusService: { updateBouncerStatus: vi.fn(), notifyChange: vi.fn(), registerStateChangeCallback: vi.fn() },
}));

vi.mock('@/services/blocklists/blocklist-db.service', () => ({
  blocklistDbService: { writeIpsToDb: vi.fn(), deleteBlocklistIps: vi.fn(), updateRefreshMetadata: vi.fn() },
}));

vi.mock('@/services/blocklists/blocklist-crowdsec.service', () => ({
  blocklistCrowdSecService: {
    downloadBlocklist: vi.fn(),
    pushIpsToCrowdSec: vi.fn(),
    deleteBlocklistAlerts: vi.fn(),
    fetchAllowlistEntries: vi.fn(),
    verifyConnection: vi.fn(),
    buildAlertPayload: vi.fn(),
  },
}));

vi.mock('@/services/blocklists/status-blocklist.service', () => ({
  statusBlocklistService: {
    createBlocklistRefreshProcess: vi.fn(),
    createBlocklistSingleRefreshProcess: vi.fn(),
    createBlocklistImportProcess: vi.fn(),
    createBlocklistDisableProcess: vi.fn(),
    createBlocklistDeleteProcess: vi.fn(),
    completeProcess: vi.fn(),
    setCurrentBlocklist: vi.fn(),
    setBlocklistStepStatus: vi.fn(),
    addBlocklistIps: vi.fn(),
    getProcessById: vi.fn(),
    markFetched: vi.fn(),
    markParsed: vi.fn(),
    addImportedIps: vi.fn(),
    markBlocklistOpComplete: vi.fn(),
    isBlocklistBusy: vi.fn(),
    isSyncingBlocklists: vi.fn(),
    isAnyBlocklistProcessRunning: vi.fn(),
  },
  SingleRefreshReporter: vi.fn().mockImplementation(() => ({
    onStep: vi.fn(),
    onParsed: vi.fn(),
    onImportProgress: vi.fn(),
    markComplete: vi.fn(),
  })),
}));

vi.mock('@/helpers/blocklists/blocklist-activation', () => ({
  fetchAndDeduplicateIps: vi.fn(),
  buildActivationSummary: vi.fn(),
}));

vi.mock('@/helpers/blocklists/blocklists-refresh-pipeline', () => ({
  runBlocklistRefreshPipeline: vi.fn(),
}));

vi.mock('@/utils/blocklist-allowlist-filter', () => ({
  filterAllowlistedIps: vi.fn(),
}));

vi.mock('@/utils/parse-blocklist', () => ({
  parseBlocklistContent: vi.fn(),
}));

describe('BlocklistOpsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifyConnection returns true when CS reachable', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.verifyConnection).mockResolvedValue(undefined);

    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    const result = await blocklistOpsService.verifyConnection();
    expect(result).toBe(true);
  });

  it('verifyConnection returns false when CS unreachable', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.verifyConnection).mockRejectedValue(new Error('timeout'));

    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    const result = await blocklistOpsService.verifyConnection();
    expect(result).toBe(false);
  });

  it('activateBlocklist runs full activation flow', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.downloadBlocklist).mockResolvedValue({ rawContent: '1.2.3.4' });
    const { parseBlocklistContent } = await import('@/utils/parse-blocklist');
    vi.mocked(parseBlocklistContent).mockReturnValue(['1.2.3.4']);
    const { filterAllowlistedIps } = await import('@/utils/blocklist-allowlist-filter');
    vi.mocked(filterAllowlistedIps).mockReturnValue(['1.2.3.4']);
    const { fetchAndDeduplicateIps, buildActivationSummary } =
      await import('@/helpers/blocklists/blocklist-activation');
    vi.mocked(fetchAndDeduplicateIps).mockResolvedValue({ uniqueNewIps: ['1.2.3.4'], alreadyBlocked: 0 });
    vi.mocked(buildActivationSummary).mockReturnValue({
      metadata: { last_refresh_attempt: new Date(), last_refresh_failed: false, last_successful_refresh: new Date() },
      logMessage: 'Activated',
    });

    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    const result = await blocklistOpsService.activateBlocklist({ id: 1, name: 'test', url: 'http://x.com' } as any);

    expect(result.allowlistSkipped).toBe(0);
  });

  it('activateBlocklist handles allowlistEntries param', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.downloadBlocklist).mockResolvedValue({ rawContent: '1.2.3.4\n5.5.5.5' });
    const { parseBlocklistContent } = await import('@/utils/parse-blocklist');
    vi.mocked(parseBlocklistContent).mockReturnValue(['1.2.3.4', '5.5.5.5']);
    const { filterAllowlistedIps } = await import('@/utils/blocklist-allowlist-filter');
    vi.mocked(filterAllowlistedIps).mockReturnValue(['5.5.5.5']);
    const { fetchAndDeduplicateIps, buildActivationSummary } =
      await import('@/helpers/blocklists/blocklist-activation');
    vi.mocked(fetchAndDeduplicateIps).mockResolvedValue({ uniqueNewIps: ['5.5.5.5'], alreadyBlocked: 0 });
    vi.mocked(buildActivationSummary).mockReturnValue({
      metadata: { last_refresh_attempt: new Date(), last_refresh_failed: false, last_successful_refresh: new Date() },
      logMessage: 'Activated',
    });

    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    const result = await blocklistOpsService.activateBlocklist({ id: 1, name: 'test', url: 'http://x.com' } as any, [
      '192.168.1.1',
    ]);
    expect(result.allowlistSkipped).toBe(1);
  });

  it('deleteBlocklistAlerts delegates correctly', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.deleteBlocklistAlerts).mockResolvedValue({ alertsCount: 2, totalDecisions: 5 });

    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    await blocklistOpsService.deleteBlocklistAlerts({ id: 1, name: 'test' } as any);

    expect(blocklistCrowdSecService.deleteBlocklistAlerts).toHaveBeenCalledWith(
      'test',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('refreshBlocklists with target calls singleBlocklist path', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    vi.mocked(statusBlocklistService.createBlocklistSingleRefreshProcess).mockReturnValue('proc-1');
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.verifyConnection).mockResolvedValue(undefined);
    vi.mocked(blocklistCrowdSecService.fetchAllowlistEntries).mockResolvedValue([]);
    const { runBlocklistRefreshPipeline } = await import('@/helpers/blocklists/blocklists-refresh-pipeline');
    vi.mocked(runBlocklistRefreshPipeline).mockResolvedValue({ pushed: 10 });

    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    const result = await blocklistOpsService.refreshBlocklists({ id: 1, name: 'test', enabled: true } as any);

    expect(result.refreshed).toBe(1);
  });

  it('refreshBlocklists with target handles connection failure', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    vi.mocked(statusBlocklistService.createBlocklistSingleRefreshProcess).mockReturnValue('proc-1');
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.verifyConnection).mockRejectedValue(new Error('timeout'));

    const { blocklistOpsService } = await import('@/services/blocklists/blocklist-ops.service');
    const result = await blocklistOpsService.refreshBlocklists({ id: 1, name: 'test' } as any);

    expect(result.refreshed).toBe(0);
  });
});
