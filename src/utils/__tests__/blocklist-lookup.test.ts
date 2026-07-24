import { describe, it, expect, vi } from 'vitest';
import { lookupIpsInBlocklists } from '@/utils/blocklist-lookup';

vi.mock('@/models', () => ({
  BlocklistIpsTable: {
    findAll: vi.fn(),
  },
}));

// We need to mock Op separately because it's a Sequelize import
vi.mock('sequelize', () => ({
  Op: { or: 'OR', like: 'LIKE' },
}));

import { BlocklistIpsTable } from '@/models';

const mockFindAll = BlocklistIpsTable.findAll as ReturnType<typeof vi.fn>;

describe('lookupIpsInBlocklists', () => {
  it('returns empty map for empty IP list', async () => {
    const result = await lookupIpsInBlocklists([]);
    expect(result.size).toBe(0);
  });

  it('returns blocklist names for exact match IPs', async () => {
    mockFindAll.mockResolvedValue([
      { value: '1.2.3.4', blocklist_name: 'blocklist-a' },
      { value: '5.6.7.8', blocklist_name: 'blocklist-b' },
    ]);

    const result = await lookupIpsInBlocklists(['1.2.3.4']);
    expect(result.get('1.2.3.4')).toEqual(['blocklist-a']);
  });

  it('matches CIDR entries for IPv4', async () => {
    mockFindAll.mockResolvedValue([{ value: '10.0.0.0/8', blocklist_name: 'cidr-list' }]);

    const result = await lookupIpsInBlocklists(['10.0.0.1']);
    expect(result.get('10.0.0.1')).toEqual(['cidr-list']);
  });

  it('does not return entries for non-matching IPs', async () => {
    mockFindAll.mockResolvedValue([{ value: '192.168.1.0/24', blocklist_name: 'test' }]);

    const result = await lookupIpsInBlocklists(['10.0.0.1']);
    expect(result.size).toBe(0);
  });

  it('aggregates results from multiple entries', async () => {
    mockFindAll.mockResolvedValue([
      { value: '1.2.3.4', blocklist_name: 'list-a' },
      { value: '1.2.3.4', blocklist_name: 'list-b' },
    ]);

    const result = await lookupIpsInBlocklists(['1.2.3.4']);
    expect(result.get('1.2.3.4')).toEqual(['list-a', 'list-b']);
  });
});
