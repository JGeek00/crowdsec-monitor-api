import { describe, it, expect, vi } from 'vitest';

vi.mock('@/config', () => ({
  config: {
    crowdsec: { lapiUrl: 'http://localhost:8080', user: 'test', password: 'test', bouncerKey: 'bk' },
  },
}));

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const mockLogin = vi.fn();
const mockIsTokenValid = vi.fn();
const mockEnsureAuthenticated = vi.fn();
const mockTestConnection = vi.fn();
const mockCheckStatus = vi.fn();
const mockCheckBouncerConnection = vi.fn();
const mockIsBouncerConnected = vi.fn();
const mockSetBouncerConnected = vi.fn();
const mockGetLastLapiConnected = vi.fn();
const mockGetAuthHeaders = vi.fn();
const mockHandleError = vi.fn();
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } },
};

vi.mock('@/services/crowdsec-api/base-client.service', () => ({
  CrowdSecBaseClient: vi.fn().mockImplementation(() => ({
    client: mockClient,
    login: mockLogin,
    isTokenValid: mockIsTokenValid,
    ensureAuthenticated: mockEnsureAuthenticated,
    testConnection: mockTestConnection,
    checkStatus: mockCheckStatus,
    checkBouncerConnection: mockCheckBouncerConnection,
    isBouncerConnected: mockIsBouncerConnected,
    setBouncerConnected: mockSetBouncerConnected,
    getLastLapiConnected: mockGetLastLapiConnected,
    getAuthHeaders: mockGetAuthHeaders,
    handleError: mockHandleError,
  })),
  AlertsService: vi.fn().mockImplementation(() => ({
    getAlerts: vi.fn(),
    getAlertById: vi.fn(),
    createAlerts: vi.fn(),
    deleteAlert: vi.fn(),
  })),
  DecisionsService: vi.fn().mockImplementation(() => ({
    getDecisionsFromAlerts: vi.fn(),
    deleteDecision: vi.fn(),
    getActiveDecisions: vi.fn(),
  })),
  AllowlistsService: vi.fn().mockImplementation(() => ({
    getAllowlists: vi.fn(),
    getAllowlistByName: vi.fn(),
    checkAllowlist: vi.fn(),
  })),
}));

describe('CrowdSecAPIService', () => {
  it('delegates login to base client', async () => {
    mockLogin.mockResolvedValue(true);
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    const result = await crowdSecAPI.login();
    expect(result).toBe(true);
  });

  it('delegates testConnection to base client', async () => {
    mockTestConnection.mockResolvedValue(true);
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    const result = await crowdSecAPI.testConnection();
    expect(result).toBe(true);
  });

  it('delegates checkStatus to base client', async () => {
    mockCheckStatus.mockResolvedValue(true);
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    const result = await crowdSecAPI.checkStatus();
    expect(result).toBe(true);
  });

  it('delegates checkBouncerConnection to base client', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    await crowdSecAPI.checkBouncerConnection();
    expect(mockCheckBouncerConnection).toHaveBeenCalled();
  });

  it('delegates isBouncerConnected to base client', async () => {
    mockIsBouncerConnected.mockReturnValue(true);
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    expect(crowdSecAPI.isBouncerConnected()).toBe(true);
  });

  it('delegates setBouncerConnected to base client', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    crowdSecAPI.setBouncerConnected(true);
    expect(mockSetBouncerConnected).toHaveBeenCalledWith(true);
  });

  it('delegates getLastLapiConnected to base client', async () => {
    mockGetLastLapiConnected.mockReturnValue(true);
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    expect(crowdSecAPI.getLastLapiConnected()).toBe(true);
  });

  it('has alerts service', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    expect(crowdSecAPI.alerts).toBeDefined();
  });
});
