import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthHeaders = vi.fn();
const mockHandleError = vi.fn();
const mockClient = {
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/crowdsec-api/base-client.service', () => ({
  CrowdSecBaseClient: vi.fn().mockImplementation(() => ({
    client: mockClient,
    getAuthHeaders: mockGetAuthHeaders,
    handleError: mockHandleError,
  })),
}));

vi.mock('@/services/crowdsec-api/alerts.service', () => ({
  AlertsService: vi.fn().mockImplementation(() => ({
    getAlerts: vi.fn(),
  })),
}));

describe('DecisionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDecisionsFromAlerts extracts decisions from alerts', async () => {
    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    vi.mocked(AlertsService).mockImplementation(() => ({
      getAlerts: vi
        .fn()
        .mockResolvedValue([
          { decisions: [{ id: 1, value: '1.2.3.4' }] },
          { decisions: [{ id: 2, value: '5.5.5.5' }] },
        ]),
    }));

    const { DecisionsService } = await import('@/services/crowdsec-api/decisions.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const { AlertsService: AlertsSvc } = await import('@/services/crowdsec-api/alerts.service');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsSvc(new CrowdSecBaseClient()));

    const result = await service.getDecisionsFromAlerts();
    expect(result).toHaveLength(2);
  });

  it('getDecisionsFromAlerts returns empty on error', async () => {
    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    vi.mocked(AlertsService).mockImplementation(() => ({
      getAlerts: vi.fn().mockRejectedValue(new Error('timeout')),
    }));

    const { DecisionsService } = await import('@/services/crowdsec-api/decisions.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const { AlertsService: AlertsSvc } = await import('@/services/crowdsec-api/alerts.service');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsSvc(new CrowdSecBaseClient()));

    const result = await service.getDecisionsFromAlerts();
    expect(result).toEqual([]);
  });

  it('deleteDecision returns nbDeleted', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockResolvedValue({ data: { nbDeleted: '3' } });

    const { DecisionsService } = await import('@/services/crowdsec-api/decisions.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsService(new CrowdSecBaseClient()));

    const result = await service.deleteDecision(1);
    expect(result).toBe(3);
  });

  it('deleteDecision throws on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockRejectedValue(new Error('fail'));

    const { DecisionsService } = await import('@/services/crowdsec-api/decisions.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsService(new CrowdSecBaseClient()));

    await expect(service.deleteDecision(1)).rejects.toThrow();
  });

  it('getActiveDecisions returns set of values', async () => {
    mockClient.get.mockResolvedValue({ data: [{ value: '1.2.3.4' }, { value: '5.5.5.5' }] });

    const { DecisionsService } = await import('@/services/crowdsec-api/decisions.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const { AlertsService } = await import('@/services/crowdsec-api/alerts.service');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsService(new CrowdSecBaseClient()));

    const result = await service.getActiveDecisions();
    expect(result.size).toBe(2);
    expect(result.has('1.2.3.4')).toBe(true);
  });
});
