import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => {
  const mockAxios: any = () => {};
  mockAxios.get = vi.fn();
  mockAxios.create = vi.fn(function () {
    return { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
  });
  mockAxios.isAxiosError = vi.fn(() => false);
  return { default: mockAxios };
});

vi.mock('@/infrastructure/crowdsec/lapi/crowdsec-api', () => ({
  crowdSecAPI: {
    allowlists: { getAllowlists: vi.fn() },
    alerts: { getAlerts: vi.fn(), createAlerts: vi.fn(), deleteAlert: vi.fn() },
    decisions: { getActiveDecisions: vi.fn() },
    isBouncerConnected: vi.fn(),
  },
}));

vi.mock('@/infrastructure/system/logger', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/config', () => ({
  config: { blocklistBanDuration: '24h', blocklists: { writeChunkSize: 1000 } },
}));

describe('BlocklistCrowdSecService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAllowlistEntries returns flat entries', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.allowlists.getAllowlists).mockResolvedValue([
      { items: [{ value: '1.2.3.4' }, { value: '5.5.5.5' }] },
      { items: [{ value: '9.9.9.9' }] },
    ] as any);

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const result = await blocklistCrowdSecService.fetchAllowlistEntries();
    expect(result).toEqual(['1.2.3.4', '5.5.5.5', '9.9.9.9']);
  });

  it('fetchAllowlistEntries returns empty on error', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.allowlists.getAllowlists).mockRejectedValue(new Error('timeout'));

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const result = await blocklistCrowdSecService.fetchAllowlistEntries();
    expect(result).toEqual([]);
  });

  it('downloadBlocklist returns raw content', async () => {
    const axios = await import('axios');
    vi.mocked(axios.default.get).mockResolvedValue({ data: 'ip1\nip2' });

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const result = await blocklistCrowdSecService.downloadBlocklist('http://x.com', 'test');
    expect(result.rawContent).toBe('ip1\nip2');
  });

  it('downloadBlocklist throws on fetch failure', async () => {
    const axios = await import('axios');
    vi.mocked(axios.default.get).mockRejectedValue(new Error('timeout'));

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    await expect(blocklistCrowdSecService.downloadBlocklist('http://x.com', 'test')).rejects.toThrow();
  });

  it('buildAlertPayload creates payload with decisions', async () => {
    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const result = blocklistCrowdSecService.buildAlertPayload(
      ['1.2.3.4', '5.5.5.5'],
      ['1.2.3.4', '5.5.5.5'],
      'test-list',
    );
    expect(result).toHaveLength(1);
    expect(result[0].decisions).toHaveLength(2);
  });

  it('pushIpsToCrowdSec returns 0 when no IPs', async () => {
    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const result = await blocklistCrowdSecService.pushIpsToCrowdSec([], 'test');
    expect(result).toBe(0);
  });

  it('pushIpsToCrowdSec pushes in batches', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.createAlerts).mockResolvedValue(['ok']);

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const onChunk = vi.fn();
    const result = await blocklistCrowdSecService.pushIpsToCrowdSec(['1.2.3.4', '5.5.5.5'], 'test', onChunk);
    expect(result).toBe(2);
    expect(onChunk).toHaveBeenCalledWith(2);
  });

  it('deleteBlocklistAlerts fetches and deletes alerts', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([{ id: 1, decisions: [{ id: 1 }] }] as any);
    vi.mocked(crowdSecAPI.alerts.deleteAlert).mockResolvedValue(1);

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const result = await blocklistCrowdSecService.deleteBlocklistAlerts('test-list');
    expect(result.alertsCount).toBe(1);
    expect(crowdSecAPI.alerts.deleteAlert).toHaveBeenCalledWith(1);
  });

  it('verifyConnection calls getAlerts', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    await blocklistCrowdSecService.verifyConnection();
    expect(crowdSecAPI.alerts.getAlerts).toHaveBeenCalledWith({});
  });
});

describe('HttpBouncerClient port adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('check returns true when the LAPI is reachable', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([]);

    const { httpBouncerClient } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    await expect(httpBouncerClient.check()).resolves.toBe(true);
  });

  it('check returns false when the LAPI is unreachable', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockRejectedValue(new Error('down'));

    const { httpBouncerClient } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    await expect(httpBouncerClient.check()).resolves.toBe(false);
  });

  it('isBouncerConnected delegates to the crowdsec api state', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.isBouncerConnected).mockReturnValue(true);

    const { httpBouncerClient } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    expect(httpBouncerClient.isBouncerConnected()).toBe(true);
  });

  it('getActiveDecisions delegates to the decisions service', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.decisions.getActiveDecisions).mockResolvedValue(new Set(['1.2.3.4']));

    const { httpBouncerClient } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    await expect(httpBouncerClient.getActiveDecisions()).resolves.toEqual(new Set(['1.2.3.4']));
  });

  it('pushIps delegates and reports chunk progress', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.createAlerts).mockResolvedValue(['a1']);

    const { httpBouncerClient } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const onChunk = vi.fn();
    await expect(httpBouncerClient.pushIps(['1.2.3.4'], 'bl', onChunk)).resolves.toBe(1);
    expect(onChunk).toHaveBeenCalledWith(1);
  });

  it('deleteBlocklistAlerts delegates with progress callback', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      { id: 1, decisions: [{ id: 'd1' }, { id: 'd2' }] },
    ] as never);
    vi.mocked(crowdSecAPI.alerts.deleteAlert).mockResolvedValue(1);

    const { httpBouncerClient } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const onProgress = vi.fn();
    await expect(httpBouncerClient.deleteBlocklistAlerts('bl', onProgress)).resolves.toBeUndefined();
    expect(onProgress).toHaveBeenCalledWith(2);
  });

  it('download returns the raw content', async () => {
    vi.mocked((await import('axios')).default.get as never as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: '10.0.0.1',
    });

    const { httpBouncerClient } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    await expect(httpBouncerClient.download('https://example.com/bl.txt')).resolves.toBe('10.0.0.1');
  });
});

describe('pushIpsToCrowdSec and deleteBlocklistAlerts error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pushIpsToCrowdSec throws the crowdSecPushFailed process error when the push rejects', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.createAlerts).mockRejectedValue(new Error('down'));

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    await expect(blocklistCrowdSecService.pushIpsToCrowdSec(['1.2.3.4'], 'bl')).rejects.toThrow(
      'Failed to push IP decisions to CrowdSec',
    );
  });

  it('deleteBlocklistAlerts throws when fetching the alerts fails', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockRejectedValue(new Error('down'));

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    await expect(blocklistCrowdSecService.deleteBlocklistAlerts('bl')).rejects.toThrow(
      'Failed to retrieve blocklist alerts from CrowdSec',
    );
  });

  it('deleteBlocklistAlerts throws and reports progress when deleting an alert fails', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      { id: 1, decisions: [{ id: 'd1' }] },
      { id: 2, decisions: [{ id: 'd2' }] },
    ] as never);
    vi.mocked(crowdSecAPI.alerts.deleteAlert).mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('delete failed'));

    const { blocklistCrowdSecService } = await import('@/infrastructure/crowdsec/http-bouncer-client');
    const onAlertDeleted = vi.fn();
    await expect(blocklistCrowdSecService.deleteBlocklistAlerts('bl', undefined, onAlertDeleted)).rejects.toThrow(
      'Failed to delete blocklist decisions from CrowdSec',
    );
    // the callback fires only after a successful deletion, so just the first alert
    expect(onAlertDeleted).toHaveBeenCalledTimes(1);
    expect(onAlertDeleted).toHaveBeenCalledWith(1, 1, 1);
  });
});
