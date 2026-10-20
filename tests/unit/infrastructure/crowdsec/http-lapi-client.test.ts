import { describe, it, expect, vi } from 'vitest';
import { HttpLapiClient } from '@/infrastructure/crowdsec/http-lapi-client';
import type { CrowdSecAPIService } from '@/infrastructure/crowdsec/lapi/crowdsec-api';

function makeApi(): CrowdSecAPIService {
  return {
    testConnection: vi.fn().mockResolvedValue(true),
    checkStatus: vi.fn().mockResolvedValue(true),
    getLastLapiConnected: vi.fn().mockReturnValue(true),
    checkBouncerConnection: vi.fn().mockResolvedValue(undefined),
    isBouncerConnected: vi.fn().mockReturnValue(true),
    alerts: {
      getAlerts: vi.fn().mockResolvedValue([]),
      deleteAlert: vi.fn().mockResolvedValue(1),
      createAlerts: vi.fn().mockResolvedValue(['1']),
    },
    decisions: {
      deleteDecision: vi.fn().mockResolvedValue(1),
    },
    allowlists: {
      getAllowlists: vi.fn().mockResolvedValue([]),
      getAllowlistByName: vi.fn().mockResolvedValue(null),
      checkAllowlist: vi.fn().mockResolvedValue([]),
    },
  } as unknown as CrowdSecAPIService;
}

describe('HttpLapiClient', () => {
  it('delegates connection checks to the underlying api service', async () => {
    const api = makeApi();
    const client = new HttpLapiClient(api);

    await expect(client.testConnection()).resolves.toBe(true);
    await expect(client.checkStatus()).resolves.toBe(true);
    expect(client.getLastLapiConnected()).toBe(true);
    await expect(client.checkBouncerConnection()).resolves.toBeUndefined();
    expect(client.isBouncerConnected()).toBe(true);
  });

  it('deletes alerts, creates alerts and fetches alerts through the alerts service', async () => {
    const api = makeApi();
    const client = new HttpLapiClient(api);

    await expect(client.getAlerts()).resolves.toEqual([]);
    expect(api.alerts.getAlerts).toHaveBeenCalledWith({});
    await expect(client.deleteAlert(5)).resolves.toBe(1);
    await expect(client.createAlerts({} as never)).resolves.toEqual(['1']);
  });

  it('deletes decisions through the decisions service', async () => {
    const api = makeApi();
    const client = new HttpLapiClient(api);

    await expect(client.deleteDecision(7)).resolves.toBe(1);
  });

  it('delegates allowlist operations to the allowlists service', async () => {
    const api = makeApi();
    const client = new HttpLapiClient(api);

    await expect(client.getAllowlists()).resolves.toEqual([]);
    await expect(client.getAllowlistByName('x')).resolves.toBeNull();
    await expect(client.checkAllowlist(['1.2.3.4'])).resolves.toEqual([]);
  });

  it('fetchAllowlistEntries flattens allowlist item values', async () => {
    const api = makeApi();
    (api.allowlists.getAllowlists as ReturnType<typeof vi.fn>).mockResolvedValue([
      { items: [{ value: '10.0.0.1' }] },
      { items: [{ value: '10.0.0.2' }, { value: '10.0.0.3' }] },
    ]);
    const client = new HttpLapiClient(api);

    await expect(client.fetchAllowlistEntries()).resolves.toEqual(['10.0.0.1', '10.0.0.2', '10.0.0.3']);
  });

  it('fetchAllowlistEntries never throws: returns an empty list on failure', async () => {
    const api = makeApi();
    (api.allowlists.getAllowlists as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('lapi down'));
    const client = new HttpLapiClient(api);

    await expect(client.fetchAllowlistEntries()).resolves.toEqual([]);
  });
});
