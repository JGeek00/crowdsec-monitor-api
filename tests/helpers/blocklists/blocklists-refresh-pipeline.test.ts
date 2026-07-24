import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/crowdsec-api.service', () => ({
  crowdSecAPI: {
    decisions: { getActiveDecisions: vi.fn() },
    alerts: { createAlerts: vi.fn() },
    setBouncerConnected: vi.fn(),
  },
}));

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/services/blocklists/blocklist-db.service', () => ({
  blocklistDbService: { writeIpsToDb: vi.fn() },
}));

vi.mock('@/services/blocklists/blocklist-crowdsec.service', () => ({
  blocklistCrowdSecService: {
    downloadBlocklist: vi.fn(),
    deleteBlocklistAlerts: vi.fn(),
    pushIpsToCrowdSec: vi.fn(),
  },
}));

vi.mock('@/utils/blocklist-allowlist-filter', () => ({
  filterAllowlistedIps: vi.fn(),
}));

vi.mock('@/utils/parse-blocklist', () => ({
  parseBlocklistContent: vi.fn(),
}));

describe('runBlocklistRefreshPipeline', () => {
  const makeReporter = () => ({
    onStep: vi.fn(),
    onParsed: vi.fn(),
    onImportProgress: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs full pipeline and returns pushed count', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.downloadBlocklist).mockResolvedValue({ rawContent: '1.2.3.4\n5.5.5.5' });
    const { parseBlocklistContent } = await import('@/utils/parse-blocklist');
    vi.mocked(parseBlocklistContent).mockReturnValue(['1.2.3.4', '5.5.5.5']);
    const { filterAllowlistedIps } = await import('@/utils/blocklist-allowlist-filter');
    vi.mocked(filterAllowlistedIps).mockReturnValue(['1.2.3.4', '5.5.5.5']);
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.decisions.getActiveDecisions).mockResolvedValue(new Set(['1.2.3.4']));
    const { blocklistDbService } = await import('@/services/blocklists/blocklist-db.service');
    vi.mocked(blocklistCrowdSecService.pushIpsToCrowdSec).mockResolvedValue(1);
    vi.mocked(blocklistCrowdSecService.deleteBlocklistAlerts).mockResolvedValue({ alertsCount: 0, totalDecisions: 0 });

    const { runBlocklistRefreshPipeline } = await import('@/helpers/blocklists/blocklists-refresh-pipeline');
    const reporter = makeReporter();
    const result = await runBlocklistRefreshPipeline(
      { id: 1, name: 'test', url: 'http://example.com/list' } as any,
      [],
      reporter,
    );

    expect(result.pushed).toBe(1);
    expect(reporter.onStep).toHaveBeenCalledTimes(8);
    expect(reporter.onParsed).toHaveBeenCalledWith(2);
    expect(blocklistDbService.writeIpsToDb).toHaveBeenCalled();
  });

  it('reports step failure on error', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    vi.mocked(blocklistCrowdSecService.downloadBlocklist).mockRejectedValue(new Error('network error'));

    const { runBlocklistRefreshPipeline } = await import('@/helpers/blocklists/blocklists-refresh-pipeline');
    const reporter = makeReporter();
    await expect(runBlocklistRefreshPipeline({ id: 1, name: 'test' } as any, [], reporter)).rejects.toThrow();

    expect(reporter.onStep).toHaveBeenCalledWith('fetch', 'failed');
  });
});
