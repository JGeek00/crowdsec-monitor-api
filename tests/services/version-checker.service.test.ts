import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('axios');
vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('VersionCheckerService', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('checkForNewVersion fetches and compares versions', async () => {
    const axios = await import('axios');
    vi.mocked(axios.default.get).mockResolvedValue({
      data: { tag_name: 'v99.99.99', name: 'v99.99.99', published_at: new Date().toISOString(), html_url: '' },
    });

    const { versionCheckerService } = await import('@/services/version-checker.service');
    await versionCheckerService.checkForNewVersion();
    expect(versionCheckerService.getLatestVersion()).toBe('v99.99.99');
  });

  it('checkForNewVersion handles error gracefully', async () => {
    const axios = await import('axios');
    vi.mocked(axios.default.get).mockRejectedValue(new Error('network error'));

    const { versionCheckerService } = await import('@/services/version-checker.service');
    await versionCheckerService.checkForNewVersion();
    expect(versionCheckerService.getLatestVersion()).toBeNull();
  });

  it('getCurrentVersion returns version from package.json', async () => {
    const { versionCheckerService } = await import('@/services/version-checker.service');
    expect(versionCheckerService.getCurrentVersion()).toBeDefined();
  });

  it('getLastCheckTime returns null initially', async () => {
    const { versionCheckerService } = await import('@/services/version-checker.service');
    expect(versionCheckerService.getLastCheckTime()).toBeNull();
  });

  it('getLatestVersion returns null when up to date', async () => {
    const axios = await import('axios');
    vi.mocked(axios.default.get).mockResolvedValue({
      data: { tag_name: 'v0.0.0', name: 'v0.0.0', published_at: new Date().toISOString(), html_url: '' },
    });

    const { versionCheckerService } = await import('@/services/version-checker.service');
    await versionCheckerService.checkForNewVersion();
    expect(versionCheckerService.getLatestVersion()).toBeNull();
  });
});
