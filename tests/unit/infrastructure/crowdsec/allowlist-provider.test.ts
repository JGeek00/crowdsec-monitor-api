import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchAllowlistEntries: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@/infrastructure/crowdsec/http-lapi-client', () => ({
  httpLapiClient: { fetchAllowlistEntries: mocks.fetchAllowlistEntries },
}));
vi.mock('@/infrastructure/system/logger', () => ({
  log: { debug: mocks.debug, warn: mocks.warn, error: vi.fn(), info: vi.fn() },
}));

import { HttpAllowlistProvider } from '@/infrastructure/crowdsec/allowlist-provider';

describe('HttpAllowlistProvider', () => {
  let provider: HttpAllowlistProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new HttpAllowlistProvider();
  });

  it('returns the fetched entries and logs the count', async () => {
    mocks.fetchAllowlistEntries.mockResolvedValue(['10.0.0.1', '10.0.0.2']);

    await expect(provider.getEntries()).resolves.toEqual(['10.0.0.1', '10.0.0.2']);
    expect(mocks.debug).toHaveBeenCalledWith('Fetched 2 allowlist entries from CrowdSec');
  });

  it('returns an empty list and warns when the fetch fails', async () => {
    mocks.fetchAllowlistEntries.mockRejectedValue(new Error('lapi down'));

    await expect(provider.getEntries()).resolves.toEqual([]);
    expect(mocks.warn).toHaveBeenCalledWith(
      'Failed to fetch allowlists from CrowdSec. No allowlist filtering will be applied.',
    );
  });
});
