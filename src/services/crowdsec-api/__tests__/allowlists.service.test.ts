import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthHeaders = vi.fn();
const mockHandleError = vi.fn();
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('@/services/crowdsec-api/base-client.service', () => ({
  CrowdSecBaseClient: vi.fn().mockImplementation(() => ({
    client: mockClient,
    getAuthHeaders: mockGetAuthHeaders,
    handleError: mockHandleError,
  })),
}));

describe('AllowlistsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllowlists returns data on success', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({ data: [{ name: 'al-1', items: [{ value: '1.2.3.4' }] }] });

    const { AllowlistsService } = await import('@/services/crowdsec-api/allowlists.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AllowlistsService(new CrowdSecBaseClient());

    const result = await service.getAllowlists();
    expect(result).toHaveLength(1);
  });

  it('getAllowlists returns empty array on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockRejectedValue(new Error('timeout'));

    const { AllowlistsService } = await import('@/services/crowdsec-api/allowlists.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AllowlistsService(new CrowdSecBaseClient());

    const result = await service.getAllowlists();
    expect(result).toEqual([]);
  });

  it('getAllowlistByName returns matching allowlist', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({
      data: [
        { name: 'al-1', items: [{ value: '1.2.3.4' }] },
        { name: 'al-2', items: [] },
      ],
    });

    const { AllowlistsService } = await import('@/services/crowdsec-api/allowlists.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AllowlistsService(new CrowdSecBaseClient());

    const result = await service.getAllowlistByName('al-1');
    expect(result?.name).toBe('al-1');
  });

  it('getAllowlistByName returns null for non-existent', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockResolvedValue({ data: [{ name: 'al-1', items: [] }] });

    const { AllowlistsService } = await import('@/services/crowdsec-api/allowlists.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AllowlistsService(new CrowdSecBaseClient());

    const result = await service.getAllowlistByName('nope');
    expect(result).toBeNull();
  });

  it('checkAllowlist returns results from API', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.post.mockResolvedValue({
      data: {
        results: [
          { target: '1.2.3.4', allowlists: ['from my-allowlist'] },
          { target: '5.5.5.5', allowlists: [] },
        ],
      },
    });

    const { AllowlistsService } = await import('@/services/crowdsec-api/allowlists.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AllowlistsService(new CrowdSecBaseClient());

    const result = await service.checkAllowlist(['1.2.3.4', '5.5.5.5']);
    expect(result[0].allowlist).toBe('my-allowlist');
    expect(result[1].allowlist).toBeNull();
  });

  it('checkAllowlist returns null mappings on error', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.post.mockRejectedValue(new Error('timeout'));

    const { AllowlistsService } = await import('@/services/crowdsec-api/allowlists.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AllowlistsService(new CrowdSecBaseClient());

    const result = await service.checkAllowlist(['1.2.3.4']);
    expect(result[0].allowlist).toBeNull();
  });

  it('getAllowlistByName returns null when getAllowlists fails', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer t' });
    mockClient.get.mockRejectedValue(new Error('timeout'));

    const { AllowlistsService } = await import('@/services/crowdsec-api/allowlists.service');
    const { CrowdSecBaseClient } = await import('@/services/crowdsec-api/base-client.service');
    const service = new AllowlistsService(new CrowdSecBaseClient());

    const result = await service.getAllowlistByName('any');
    expect(result).toBeNull();
  });
});
