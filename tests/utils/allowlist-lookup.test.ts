import { describe, it, expect, vi } from 'vitest';
import { lookupIpsInAllowlists } from '@/utils/allowlist-lookup';

vi.mock('@/services', () => ({
  crowdSecAPI: {
    allowlists: {
      getAllowlists: vi.fn(),
    },
  },
}));

import { crowdSecAPI } from '@/services';

const mockGetAllowlists = crowdSecAPI.allowlists.getAllowlists as ReturnType<typeof vi.fn>;

describe('lookupIpsInAllowlists', () => {
  it('returns empty map for empty IP list', async () => {
    const result = await lookupIpsInAllowlists([]);
    expect(result.size).toBe(0);
  });

  it('returns allowlist names for exact match IPs', async () => {
    mockGetAllowlists.mockResolvedValue([
      {
        name: 'allowlist-a',
        items: [{ value: '1.2.3.4' }, { value: '5.6.7.8' }],
        description: '',
        created_at: '',
        updated_at: '',
      },
    ]);

    const result = await lookupIpsInAllowlists(['1.2.3.4']);
    expect(result.get('1.2.3.4')).toEqual(['allowlist-a']);
  });

  it('matches CIDR entries for IPv4', async () => {
    mockGetAllowlists.mockResolvedValue([
      {
        name: 'cidr-list',
        items: [{ value: '10.0.0.0/8' }],
        description: '',
        created_at: '',
        updated_at: '',
      },
    ]);

    const result = await lookupIpsInAllowlists(['10.0.0.1']);
    expect(result.get('10.0.0.1')).toEqual(['cidr-list']);
  });

  it('does not return entries for non-matching IPs', async () => {
    mockGetAllowlists.mockResolvedValue([
      {
        name: 'test-list',
        items: [{ value: '192.168.1.0/24' }],
        description: '',
        created_at: '',
        updated_at: '',
      },
    ]);

    const result = await lookupIpsInAllowlists(['10.0.0.1']);
    expect(result.size).toBe(0);
  });

  it('aggregates results from multiple allowlists', async () => {
    mockGetAllowlists.mockResolvedValue([
      {
        name: 'list-a',
        items: [{ value: '1.2.3.4' }],
        description: '',
        created_at: '',
        updated_at: '',
      },
      {
        name: 'list-b',
        items: [{ value: '1.2.3.4' }],
        description: '',
        created_at: '',
        updated_at: '',
      },
    ]);

    const result = await lookupIpsInAllowlists(['1.2.3.4']);
    expect(result.get('1.2.3.4')).toEqual(['list-a', 'list-b']);
  });
});
