import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config', () => ({
  config: {
    crowdsec: { lapiUrl: 'http://localhost:8080', user: 'test-user', password: 'test-pass', bouncerKey: 'test-bk' },
  },
}));

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } },
  };
  const mockAxios: any = vi.fn(() => mockAxiosInstance);
  mockAxios.create = vi.fn(() => mockAxiosInstance);
  mockAxios.isAxiosError = vi.fn((err: any) => err?.isAxiosError === true);
  return { default: mockAxios };
});

describe('CrowdSecBaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login succeeds with valid token response', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    vi.mocked(client.client.post).mockResolvedValue({
      data: { token: 'test-token', expire: new Date(Date.now() + 3600000).toISOString() },
    });

    const result = await client.login();
    expect(result).toBe(true);
  });

  it('login returns false when no token', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    vi.mocked(client.client.post).mockResolvedValue({
      data: { expire: new Date().toISOString() },
    });

    const result = await client.login();
    expect(result).toBe(false);
  });

  it('login returns false on error', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    vi.mocked(client.client.post).mockRejectedValue(new Error('boom'));

    const result = await client.login();
    expect(result).toBe(false);
  });

  it('isTokenValid returns false without token', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    expect(client.isTokenValid()).toBe(false);
  });

  it('isTokenValid returns true for valid token', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    (client as any).token = 'valid';
    (client as any).tokenExpiration = new Date(Date.now() + 3600000);
    expect(client.isTokenValid()).toBe(true);
  });

  it('ensureAuthenticated returns cached promise for concurrent calls', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    (client as any).token = 'expired';
    (client as any).tokenExpiration = new Date(Date.now() - 1000);
    vi.mocked(client.client.post).mockResolvedValue({
      data: { token: 'fresh', expire: new Date(Date.now() + 3600000).toISOString() },
    });

    const [r1, r2] = await Promise.all([client.ensureAuthenticated(), client.ensureAuthenticated()]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(client.client.post).toHaveBeenCalledTimes(1);
  });

  it('testConnection returns false when login fails', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    vi.mocked(client.client.post).mockRejectedValue(new Error('boom'));

    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  it('checkStatus returns false when not authenticated', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    vi.mocked(client.client.post).mockRejectedValue(new Error('boom'));

    const result = await client.checkStatus();
    expect(result).toBe(false);
  });

  it('checkBouncerConnection sets bouncerConnected on success', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    vi.mocked(client.client.get).mockResolvedValue({ data: [] });

    await client.checkBouncerConnection();
    expect(client.isBouncerConnected()).toBe(true);
  });

  it('checkBouncerConnection sets bouncerConnected false on error', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    vi.mocked(client.client.get).mockRejectedValue(new Error('timeout'));

    await client.checkBouncerConnection();
    expect(client.isBouncerConnected()).toBe(false);
  });

  it('handleError handles different error types', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();

    client.handleError({ isAxiosError: true, response: { status: 401, data: 'unauthorized' } }, 'testing');
    client.handleError({ isAxiosError: true, request: {}, message: 'timeout', code: 'ECONNABORTED' }, 'testing');
    client.handleError(new Error('unexpected'), 'testing');
  });

  it('setBouncerConnected updates the flag', async () => {
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const client = new CrowdSecBaseClient();
    client.setBouncerConnected(true);
    expect(client.isBouncerConnected()).toBe(true);
    client.setBouncerConnected(false);
    expect(client.isBouncerConnected()).toBe(false);
  });
});
