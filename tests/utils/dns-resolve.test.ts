import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveIps } from '@/utils/dns-resolve';

// Mock the entire dns/promises module
vi.mock('dns/promises', () => {
  const mockResolver = vi.fn();
  mockResolver.prototype.setServers = vi.fn();
  mockResolver.prototype.resolve4 = vi.fn();
  mockResolver.prototype.resolve6 = vi.fn();
  return {
    Resolver: mockResolver,
  };
});

import { Resolver } from 'dns/promises';

const MockResolver = Resolver as unknown as ReturnType<typeof vi.fn>;

describe('resolveIps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves both IPv4 and IPv6 addresses', async () => {
    MockResolver.prototype.resolve4.mockResolvedValue(['1.2.3.4']);
    MockResolver.prototype.resolve6.mockResolvedValue(['::1']);

    const result = await resolveIps('example.com', '8.8.8.8');

    expect(result).toEqual(['1.2.3.4', '::1']);
    expect(MockResolver.prototype.setServers).toHaveBeenCalledWith(['8.8.8.8']);
  });

  it('returns only IPv4 when IPv6 resolution fails', async () => {
    MockResolver.prototype.resolve4.mockResolvedValue(['1.2.3.4']);
    MockResolver.prototype.resolve6.mockRejectedValue(new Error('No IPv6'));

    const result = await resolveIps('example.com', '8.8.8.8');
    expect(result).toEqual(['1.2.3.4']);
  });

  it('returns only IPv6 when IPv4 resolution fails', async () => {
    MockResolver.prototype.resolve4.mockRejectedValue(new Error('No IPv4'));
    MockResolver.prototype.resolve6.mockResolvedValue(['::1']);

    const result = await resolveIps('example.com', '8.8.8.8');
    expect(result).toEqual(['::1']);
  });

  it('returns empty array when both resolutions fail', async () => {
    MockResolver.prototype.resolve4.mockRejectedValue(new Error('Timeout'));
    MockResolver.prototype.resolve6.mockRejectedValue(new Error('Timeout'));

    const result = await resolveIps('example.com', '8.8.8.8');
    expect(result).toEqual([]);
  });

  it('filters out empty string results', async () => {
    MockResolver.prototype.resolve4.mockResolvedValue(['1.2.3.4', '']);
    MockResolver.prototype.resolve6.mockResolvedValue([]);

    const result = await resolveIps('example.com', '8.8.8.8');
    expect(result).toEqual(['1.2.3.4']);
  });
});
