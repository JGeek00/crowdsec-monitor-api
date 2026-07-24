import { describe, it, expect, vi } from 'vitest';

vi.mock('@/models', () => ({
  BlocklistIpsTable: {},
}));

describe('BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE', () => {
  it('returns a literal and alias array', async () => {
    const { BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE } = await import('@/helpers/blocklists/blocklists-db-queries');
    expect(BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE).toBeInstanceOf(Array);
    expect(BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE[1]).toBe('count_ips');
  });
});

describe('BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE', () => {
  it('returns a literal and alias array', async () => {
    const { BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE } = await import('@/helpers/blocklists/blocklists-db-queries');
    expect(BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE).toBeInstanceOf(Array);
    expect(BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE[1]).toBe('count_ips');
  });
});

describe('BLOCKLISTS_IPS_INCLUDE_OPTION', () => {
  it('includes BlocklistIpsTable with as blocklistIps', async () => {
    const { BLOCKLISTS_IPS_INCLUDE_OPTION } = await import('@/helpers/blocklists/blocklists-db-queries');
    expect(BLOCKLISTS_IPS_INCLUDE_OPTION.as).toBe('blocklistIps');
    expect(BLOCKLISTS_IPS_INCLUDE_OPTION.attributes).toEqual({ exclude: ['created_at', 'updated_at'] });
  });
});
