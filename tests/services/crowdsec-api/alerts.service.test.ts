import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthHeaders = vi.fn();
const mockHandleError = vi.fn();
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/crowdsec-api/base-client.service', () => ({
  CrowdSecBaseClient: vi.fn().mockImplementation(() => ({
    client: mockClient,
    getAuthHeaders: mockGetAuthHeaders,
    handleError: mockHandleError,
  })),
}));

describe('AlertsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAlerts returns data on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({ data: [{ id: 1 }] });

    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.getAlerts({ origin: 'crowdsec' });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('getAlerts returns empty array on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockRejectedValue(new Error('timeout'));

    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.getAlerts();
    expect(result).toEqual([]);
  });

  it('getAlertById returns null on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockRejectedValue(new Error('timeout'));

    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.getAlertById(1);
    expect(result).toBeNull();
  });

  it('getAlertById returns data on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({ data: { id: 1 } });

    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.getAlertById(1);
    expect(result).toEqual({ id: 1 });
  });

  it('createAlerts returns data array on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.post.mockResolvedValue({ data: ['id1'] });

    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.createAlerts([{} as any]);
    expect(result).toEqual(['id1']);
  });

  it('createAlerts throws on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.post.mockRejectedValue(new Error('fail'));

    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AlertsService(new CrowdSecBaseClient());

    await expect(service.createAlerts([{} as any])).rejects.toThrow();
  });

  it('deleteAlert returns nbDeleted on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockResolvedValue({ data: { nbDeleted: '2' } });

    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AlertsService(new CrowdSecBaseClient());

    const result = await service.deleteAlert(1);
    expect(result).toBe(2);
  });

  it('deleteAlert throws on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockRejectedValue(new Error('fail'));

    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AlertsService(new CrowdSecBaseClient());

    await expect(service.deleteAlert(1)).rejects.toThrow();
  });
});
