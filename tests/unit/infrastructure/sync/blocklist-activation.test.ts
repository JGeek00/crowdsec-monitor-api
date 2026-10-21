import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/infrastructure/crowdsec/lapi/crowdsec-api', () => ({
  crowdSecAPI: {
    decisions: { getActiveDecisions: vi.fn() },
    setBouncerConnected: vi.fn(),
  },
}));

vi.mock('@/infrastructure/status/monitor-status-store', () => ({
  statusService: { updateBouncerStatus: vi.fn() },
}));

vi.mock('@/infrastructure/system/logger', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('fetchAndDeduplicateIps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns uniqueNewIps and alreadyBlocked when active decisions are fetched', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    const { statusService } = await import('@/infrastructure/status/monitor-status-store');
    vi.mocked(crowdSecAPI.decisions.getActiveDecisions).mockResolvedValue(new Set(['1.2.3.4', '5.6.7.8']));

    const { fetchAndDeduplicateIps } = await import('@/infrastructure/sync/blocklist-activation');
    const result = await fetchAndDeduplicateIps(['1.2.3.4', '9.9.9.9'], 'test-list');

    expect(result.uniqueNewIps).toEqual(['9.9.9.9']);
    expect(result.alreadyBlocked).toBe(1);
    expect(crowdSecAPI.setBouncerConnected).toHaveBeenCalledWith(true);
    expect(statusService.updateBouncerStatus).toHaveBeenCalledWith(true);
  });

  it('throws when getActiveDecisions fails', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    const { statusService } = await import('@/infrastructure/status/monitor-status-store');
    vi.mocked(crowdSecAPI.decisions.getActiveDecisions).mockRejectedValue(new Error('timeout'));

    const { fetchAndDeduplicateIps } = await import('@/infrastructure/sync/blocklist-activation');
    await expect(fetchAndDeduplicateIps(['1.2.3.4'], 'test-list')).rejects.toThrow();
    expect(crowdSecAPI.setBouncerConnected).toHaveBeenCalledWith(false);
    expect(statusService.updateBouncerStatus).toHaveBeenCalledWith(false);
  });

  it('handles no duplicates', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.decisions.getActiveDecisions).mockResolvedValue(new Set(['5.5.5.5']));

    const { fetchAndDeduplicateIps } = await import('@/infrastructure/sync/blocklist-activation');
    const result = await fetchAndDeduplicateIps(['1.2.3.4'], 'test-list');

    expect(result.uniqueNewIps).toEqual(['1.2.3.4']);
    expect(result.alreadyBlocked).toBe(0);
  });
});

describe('buildActivationSummary', () => {
  it('builds success metadata with log message', async () => {
    const { buildActivationSummary } = await import('@/infrastructure/sync/blocklist-activation');
    const result = buildActivationSummary('test-list', ['1.2.3.4', '5.5.5.5'], ['1.2.3.4'], 2, true);

    expect(result.metadata.last_refresh_failed).toBe(false);
    expect(result.metadata.last_successful_refresh).toBeInstanceOf(Date);
    expect(result.logMessage).toContain('test-list');
  });

  it('builds failure metadata without log message', async () => {
    const { buildActivationSummary } = await import('@/infrastructure/sync/blocklist-activation');
    const result = buildActivationSummary('test-list', [], [], 0, false);

    expect(result.metadata.last_refresh_failed).toBe(true);
    expect(result.metadata.last_successful_refresh).toBeUndefined();
    expect(result.logMessage).toBeUndefined();
  });
});
