import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthHeaders = vi.fn();
const mockHandleError = vi.fn();
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/infrastructure/crowdsec/lapi/base-client', () => ({
  CrowdSecBaseClient: vi.fn().mockImplementation(function () {
    return {
      client: mockClient,
      getAuthHeaders: mockGetAuthHeaders,
      handleError: mockHandleError,
    };
  }),
}));

describe('AlertsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAlerts returns data on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({ data: [{ id: 1 }] });

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.getAlerts({ origin: 'crowdsec' });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('getAlerts returns empty array on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockRejectedValue(new Error('timeout'));

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.getAlerts();
    expect(result).toEqual([]);
  });

  it('getAlertById returns null on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockRejectedValue(new Error('timeout'));

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.getAlertById(1);
    expect(result).toBeNull();
  });

  it('getAlertById returns data on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({ data: { id: 1 } });

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.getAlertById(1);
    expect(result).toEqual({ id: 1 });
  });

  it('createAlerts returns data array on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.post.mockResolvedValue({ data: ['id1'] });

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.createAlerts([{} as any]);
    expect(result).toEqual(['id1']);
  });

  it('createAlerts throws on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.post.mockRejectedValue(new Error('fail'));

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    await expect(service.createAlerts([{} as any])).rejects.toThrow();
  });

  it('deleteAlert returns nbDeleted on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockResolvedValue({ data: { nbDeleted: '2' } });

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.deleteAlert(1);
    expect(result).toBe(2);
  });

  it('deleteAlert throws on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockRejectedValue(new Error('fail'));

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    await expect(service.deleteAlert(1)).rejects.toThrow();
  });
});

describe('AlertsService param and fallback branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAlerts appends every optional filter to the query params', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({ data: [] });

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    await service.getAlerts({
      since: '1h',
      until: 'now',
      has_active_decision: true,
      origin: 'crowdsec',
      scenario: 'ssh-bf',
    });

    const params = mockClient.get.mock.calls[0][1].params as URLSearchParams;
    expect(params.get('since')).toBe('1h');
    expect(params.get('until')).toBe('now');
    expect(params.get('has_active_decision')).toBe('true');
    expect(params.get('origin')).toBe('crowdsec');
    expect(params.get('scenario')).toBe('ssh-bf');
  });

  it('getAlerts returns empty array when the response data is falsy', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({ data: null });

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    await expect(service.getAlerts()).resolves.toEqual([]);
  });

  it('createAlerts returns empty array when the response data is not an array', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.post.mockResolvedValue({ data: {} });

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    await expect(service.createAlerts({} as never)).resolves.toEqual([]);
  });

  it('deleteAlert returns 0 when the response reports no deleted rows', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockResolvedValue({ data: {} });

    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new AlertsService(new CrowdSecBaseClient());

    await expect(service.deleteAlert(1)).resolves.toBe(0);
  });
});
