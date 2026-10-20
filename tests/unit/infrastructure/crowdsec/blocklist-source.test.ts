import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { get: mocks.axiosGet },
}));
vi.mock('@/infrastructure/system/logger', () => ({
  log: { debug: mocks.debug, warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { HttpBlocklistSource } from '@/infrastructure/crowdsec/blocklist-source';

describe('HttpBlocklistSource', () => {
  let source: HttpBlocklistSource;

  beforeEach(() => {
    vi.clearAllMocks();
    source = new HttpBlocklistSource();
  });

  it('downloads the blocklist as text', async () => {
    mocks.axiosGet.mockResolvedValue({ data: '10.0.0.1\n10.0.0.2' });

    await expect(source.download('https://example.com/bl.txt')).resolves.toBe('10.0.0.1\n10.0.0.2');
    expect(mocks.axiosGet).toHaveBeenCalledWith('https://example.com/bl.txt', {
      responseType: 'text',
      timeout: 30000,
    });
    expect(mocks.debug).toHaveBeenCalledWith('  Fetched blocklist: 17 bytes');
  });

  it('maps download failures to the fetchFailed process error', async () => {
    mocks.axiosGet.mockRejectedValue(new Error('network down'));

    await expect(source.download('https://example.com/bl.txt')).rejects.toThrow(
      'Failed to fetch the blocklist content from the remote URL',
    );
  });
});
