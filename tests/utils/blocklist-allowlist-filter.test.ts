import { describe, it, expect } from 'vitest';
import { filterAllowlistedIps } from '@/utils/blocklist-allowlist-filter';

describe('filterAllowlistedIps', () => {
  it('removes exact match allowlisted IPs', () => {
    const result = filterAllowlistedIps(['1.2.3.4', '5.6.7.8', '9.9.9.9'], 'test', ['1.2.3.4']);
    expect(result).toEqual(['5.6.7.8', '9.9.9.9']);
  });

  it('removes CIDR allowlisted IPs', () => {
    const result = filterAllowlistedIps(['10.0.0.1', '10.0.0.2', '1.2.3.4'], 'test', ['10.0.0.0/8']);
    expect(result).toEqual(['1.2.3.4']);
  });

  it('returns all IPs when no allowlist entries match', () => {
    const result = filterAllowlistedIps(['1.2.3.4', '5.6.7.8'], 'test', ['192.168.0.0/16']);
    expect(result).toEqual(['1.2.3.4', '5.6.7.8']);
  });

  it('returns all IPs when allowlist is empty', () => {
    const result = filterAllowlistedIps(['1.2.3.4', '5.6.7.8'], 'test', []);
    expect(result).toEqual(['1.2.3.4', '5.6.7.8']);
  });

  it('returns empty array when all IPs are allowlisted', () => {
    const result = filterAllowlistedIps(['1.2.3.4', '5.6.7.8'], 'test', ['1.2.3.4', '5.6.7.8']);
    expect(result).toEqual([]);
  });

  it('handles mixed exact and CIDR allowlist entries', () => {
    const result = filterAllowlistedIps(['192.168.1.1', '10.0.0.1', '1.2.3.4'], 'test', ['192.168.1.1', '10.0.0.0/8']);
    expect(result).toEqual(['1.2.3.4']);
  });
});
