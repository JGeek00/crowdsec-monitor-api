import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => {
  const mockAxios: any = () => {};
  mockAxios.get = vi.fn();
  mockAxios.create = vi.fn(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
  mockAxios.isAxiosError = vi.fn(() => false);
  return { default: mockAxios };
});

vi.mock('@/services/crowdsec-api.service', () => ({
  crowdSecAPI: {
    allowlists: { getAllowlists: vi.fn() },
    alerts: { getAlerts: vi.fn(), createAlerts: vi.fn(), deleteAlert: vi.fn() },
  },
}));

vi.mock('@/services/log.service', () => ({
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
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.allowlists.getAllowlists).mockResolvedValue([
      { items: [{ value: '1.2.3.4' }, { value: '5.5.5.5' }] },
      { items: [{ value: '9.9.9.9' }] },
    ] as any);

    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    const result = await blocklistCrowdSecService.fetchAllowlistEntries();
    expect(result).toEqual(['1.2.3.4', '5.5.5.5', '9.9.9.9']);
  });

  it('fetchAllowlistEntries returns empty on error', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.allowlists.getAllowlists).mockRejectedValue(new Error('timeout'));

    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    const result = await blocklistCrowdSecService.fetchAllowlistEntries();
    expect(result).toEqual([]);
  });

  it('downloadBlocklist returns raw content', async () => {
    const axios = await import('axios');
    vi.mocked(axios.default.get).mockResolvedValue({ data: 'ip1\nip2' });

    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    const result = await blocklistCrowdSecService.downloadBlocklist('http://x.com', 'test');
    expect(result.rawContent).toBe('ip1\nip2');
  });

  it('downloadBlocklist throws on fetch failure', async () => {
    const axios = await import('axios');
    vi.mocked(axios.default.get).mockRejectedValue(new Error('timeout'));

    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    await expect(blocklistCrowdSecService.downloadBlocklist('http://x.com', 'test')).rejects.toThrow();
  });

  it('buildAlertPayload creates payload with decisions', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    const result = blocklistCrowdSecService.buildAlertPayload(
      ['1.2.3.4', '5.5.5.5'],
      ['1.2.3.4', '5.5.5.5'],
      'test-list',
    );
    expect(result).toHaveLength(1);
    expect(result[0].decisions).toHaveLength(2);
  });

  it('pushIpsToCrowdSec returns 0 when no IPs', async () => {
    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    const result = await blocklistCrowdSecService.pushIpsToCrowdSec([], 'test');
    expect(result).toBe(0);
  });

  it('pushIpsToCrowdSec pushes in batches', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.alerts.createAlerts).mockResolvedValue(['ok']);

    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    const onChunk = vi.fn();
    const result = await blocklistCrowdSecService.pushIpsToCrowdSec(['1.2.3.4', '5.5.5.5'], 'test', onChunk);
    expect(result).toBe(2);
    expect(onChunk).toHaveBeenCalledWith(2);
  });

  it('deleteBlocklistAlerts fetches and deletes alerts', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([{ id: 1, decisions: [{ id: 1 }] }] as any);
    vi.mocked(crowdSecAPI.alerts.deleteAlert).mockResolvedValue(1);

    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    const result = await blocklistCrowdSecService.deleteBlocklistAlerts('test-list');
    expect(result.alertsCount).toBe(1);
    expect(crowdSecAPI.alerts.deleteAlert).toHaveBeenCalledWith(1);
  });

  it('verifyConnection calls getAlerts', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');

    const { blocklistCrowdSecService } = await import('@/services/blocklists/blocklist-crowdsec.service');
    await blocklistCrowdSecService.verifyConnection();
    expect(crowdSecAPI.alerts.getAlerts).toHaveBeenCalledWith({});
  });
});
