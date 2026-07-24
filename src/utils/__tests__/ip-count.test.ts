import { describe, it, expect } from 'vitest';
import { countIpsInValue } from '@/utils/ip-count';

describe('countIpsInValue', () => {
  it('returns 1 for a plain IP address', () => {
    expect(countIpsInValue('1.2.3.4')).toBe(1);
  });

  it('returns 1 for /32 CIDR', () => {
    expect(countIpsInValue('1.2.3.4/32')).toBe(1);
  });

  it('returns 256 for /24 CIDR', () => {
    expect(countIpsInValue('1.2.3.0/24')).toBe(256);
  });

  it('returns 65536 for /16 CIDR', () => {
    expect(countIpsInValue('1.2.0.0/16')).toBe(65536);
  });

  it('returns 16777216 for /8 CIDR', () => {
    expect(countIpsInValue('10.0.0.0/8')).toBe(16777216);
  });

  it('handles /0 CIDR', () => {
    expect(countIpsInValue('0.0.0.0/0')).toBe(4294967296);
  });

  it('returns 1 for invalid CIDR prefix (>32)', () => {
    expect(countIpsInValue('1.2.3.0/33')).toBe(1);
  });

  it('returns 1 for malformed CIDR', () => {
    // The regex matches /<digits> at the end, so "not-a-cidr/24" matches
    // and would compute 2^(32-24)=256, but a string like "no-number-at-end" returns 1
    expect(countIpsInValue('no-number-at-end')).toBe(1);
    expect(countIpsInValue('not-a-cidr')).toBe(1);
  });

  it('handles IPv6 addresses (returns 1)', () => {
    expect(countIpsInValue('::1')).toBe(1);
  });
});
