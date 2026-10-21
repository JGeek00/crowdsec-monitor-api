import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthHeaders = vi.fn();
const mockHandleError = vi.fn();
const mockClient = {
  get: vi.fn(),
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

vi.mock('@/infrastructure/crowdsec/lapi/alerts', () => ({
  AlertsService: vi.fn().mockImplementation(function () {
    return {
      getAlerts: vi.fn(),
    };
  }),
}));

describe('DecisionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDecisionsFromAlerts extracts decisions from alerts', async () => {
    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    vi.mocked(AlertsService).mockImplementation(function () {
      return {
        getAlerts: vi
          .fn()
          .mockResolvedValue([
            { decisions: [{ id: 1, value: '1.2.3.4' }] },
            { decisions: [{ id: 2, value: '5.5.5.5' }] },
          ]),
      };
    });

    const { DecisionsService } = await import('@/infrastructure/crowdsec/lapi/decisions');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const { AlertsService: AlertsSvc } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsSvc(new CrowdSecBaseClient()));

    const result = await service.getDecisionsFromAlerts();
    expect(result).toHaveLength(2);
  });

  it('getDecisionsFromAlerts returns empty on error', async () => {
    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    vi.mocked(AlertsService).mockImplementation(function () {
      return {
        getAlerts: vi.fn().mockRejectedValue(new Error('timeout')),
      };
    });

    const { DecisionsService } = await import('@/infrastructure/crowdsec/lapi/decisions');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const { AlertsService: AlertsSvc } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsSvc(new CrowdSecBaseClient()));

    const result = await service.getDecisionsFromAlerts();
    expect(result).toEqual([]);
  });

  it('deleteDecision returns nbDeleted', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockResolvedValue({ data: { nbDeleted: '3' } });

    const { DecisionsService } = await import('@/infrastructure/crowdsec/lapi/decisions');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsService(new CrowdSecBaseClient()));

    const result = await service.deleteDecision(1);
    expect(result).toBe(3);
  });

  it('deleteDecision throws on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.delete.mockRejectedValue(new Error('fail'));

    const { DecisionsService } = await import('@/infrastructure/crowdsec/lapi/decisions');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsService(new CrowdSecBaseClient()));

    await expect(service.deleteDecision(1)).rejects.toThrow();
  });

  it('getActiveDecisions returns set of values', async () => {
    mockClient.get.mockResolvedValue({ data: [{ value: '1.2.3.4' }, { value: '5.5.5.5' }] });

    const { DecisionsService } = await import('@/infrastructure/crowdsec/lapi/decisions');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsService(new CrowdSecBaseClient()));

    const result = await service.getActiveDecisions();
    expect(result.size).toBe(2);
    expect(result.has('1.2.3.4')).toBe(true);
  });
});

describe('DecisionsService fallback branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDecisionsFromAlerts skips alerts whose decisions are not an array', async () => {
    const { AlertsService } = await import('@/infrastructure/crowdsec/lapi/alerts');
    vi.mocked(AlertsService).mockImplementation(function () {
      return {
        getAlerts: vi
          .fn()
          .mockResolvedValue([{ decisions: null }, { decisions: 'not-an-array' }, { noDecisionsKey: true }]),
      };
    });

    const { DecisionsService } = await import('@/infrastructure/crowdsec/lapi/decisions');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const { AlertsService: AlertsSvc } = await import('@/infrastructure/crowdsec/lapi/alerts');
    const service = new DecisionsService(new CrowdSecBaseClient(), new AlertsSvc(new CrowdSecBaseClient()));

    await expect(service.getDecisionsFromAlerts()).resolves.toEqual([]);
  });

  it('getActiveDecisions returns an empty set when the response data is falsy', async () => {
    mockClient.get.mockResolvedValue({ data: null });

    const { DecisionsService } = await import('@/infrastructure/crowdsec/lapi/decisions');
    const { CrowdSecBaseClient } = await import('@/infrastructure/crowdsec/lapi/base-client');
    const service = new DecisionsService(new CrowdSecBaseClient());

    await expect(service.getActiveDecisions()).resolves.toEqual(new Set());
  });
});
