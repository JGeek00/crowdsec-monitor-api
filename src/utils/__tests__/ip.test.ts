import { describe, it, expect } from 'vitest';
import { isIpv4, ipToInt32, isIpv4InCidr, isIpv6InCidr, buildAllowlistMatcher } from '@/utils/ip';

describe('isIpv4', () => {
  it('returns true for valid IPv4 addresses', () => {
    expect(isIpv4('192.168.1.1')).toBe(true);
    expect(isIpv4('0.0.0.0')).toBe(true);
    expect(isIpv4('255.255.255.255')).toBe(true);
    expect(isIpv4('10.0.0.1')).toBe(true);
  });

  it('returns false for invalid IPv4 addresses', () => {
    expect(isIpv4('')).toBe(false);
    expect(isIpv4('not-an-ip')).toBe(false);
    expect(isIpv4('256.1.2.3')).toBe(false);
    expect(isIpv4('192.168.1')).toBe(false);
    expect(isIpv4('192.168.1.1.1')).toBe(false);
  });
});

describe('ipToInt32', () => {
  it('converts IPv4 to integer correctly', () => {
    expect(ipToInt32('0.0.0.0')).toBe(0);
    expect(ipToInt32('255.255.255.255')).toBe(4294967295);
    expect(ipToInt32('192.168.1.1')).toBe(3232235777);
    expect(ipToInt32('10.0.0.1')).toBe(167772161);
    expect(ipToInt32('127.0.0.1')).toBe(2130706433);
  });
});

describe('isIpv4InCidr', () => {
  it('returns true when IP is within CIDR range', () => {
    expect(isIpv4InCidr('192.168.1.50', '192.168.1.0/24')).toBe(true);
    expect(isIpv4InCidr('10.0.0.1', '10.0.0.0/8')).toBe(true);
    expect(isIpv4InCidr('192.168.1.0', '192.168.1.0/24')).toBe(true);
    expect(isIpv4InCidr('192.168.1.255', '192.168.1.0/24')).toBe(true);
  });

  it('returns false when IP is outside CIDR range', () => {
    expect(isIpv4InCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
    expect(isIpv4InCidr('11.0.0.1', '10.0.0.0/8')).toBe(false);
  });

  it('handles /0 prefix (all IPs match)', () => {
    expect(isIpv4InCidr('1.2.3.4', '0.0.0.0/0')).toBe(true);
    expect(isIpv4InCidr('255.255.255.255', '0.0.0.0/0')).toBe(true);
  });

  it('handles /32 prefix (exact match)', () => {
    expect(isIpv4InCidr('192.168.1.1', '192.168.1.1/32')).toBe(true);
    expect(isIpv4InCidr('192.168.1.2', '192.168.1.1/32')).toBe(false);
  });

  it('returns false for malformed CIDR notation', () => {
    expect(isIpv4InCidr('1.2.3.4', 'not-a-cidr')).toBe(false);
    expect(isIpv4InCidr('1.2.3.4', '1.2.3.4/33')).toBe(false);
    expect(isIpv4InCidr('1.2.3.4', '1.2.3.4/-1')).toBe(false);
    expect(isIpv4InCidr('1.2.3.4', '')).toBe(false);
  });
});

describe('isIpv6InCidr', () => {
  it('returns true when IPv6 is within CIDR range', () => {
    expect(isIpv6InCidr('::1', '::/0')).toBe(true);
    expect(isIpv6InCidr('2001:db8::1', '2001:db8::/32')).toBe(true);
  });

  it('handles /0 prefix (all IPv6 match)', () => {
    expect(isIpv6InCidr('::1', '::/0')).toBe(true);
    expect(isIpv6InCidr('ffff::', '::/0')).toBe(true);
  });

  it('handles /128 prefix (exact match)', () => {
    expect(isIpv6InCidr('2001:db8::1', '2001:db8::1/128')).toBe(true);
    expect(isIpv6InCidr('2001:db8::2', '2001:db8::1/128')).toBe(false);
  });

  it('returns false for malformed CIDR', () => {
    expect(isIpv6InCidr('::1', '::1/129')).toBe(false);
    expect(isIpv6InCidr('::1', 'not-valid')).toBe(false);
    expect(isIpv6InCidr('::1', '::1/-1')).toBe(false);
  });
});

describe('buildAllowlistMatcher', () => {
  const entries = ['1.2.3.4', '10.0.0.0/8', '2001:db8::/32'];

  it('matches exact IPv4', () => {
    const matcher = buildAllowlistMatcher(entries);
    expect(matcher('1.2.3.4')).toBe(true);
  });

  it('matches IPv4 within CIDR range', () => {
    const matcher = buildAllowlistMatcher(entries);
    expect(matcher('10.0.0.1')).toBe(true);
    expect(matcher('10.255.255.255')).toBe(true);
  });

  it('matches IPv6 within CIDR range', () => {
    const matcher = buildAllowlistMatcher(['2001:db8::/32']);
    expect(matcher('2001:db8::1')).toBe(true);
    expect(matcher('2001:db8:abcd::1')).toBe(true);
  });

  it('returns false when no match', () => {
    const matcher = buildAllowlistMatcher(entries);
    expect(matcher('5.6.7.8')).toBe(false);
    expect(matcher('11.0.0.1')).toBe(false);
    expect(matcher('2001:db9::1')).toBe(false);
  });

  it('returns false for non-IP strings', () => {
    const matcher = buildAllowlistMatcher(entries);
    expect(matcher('not-an-ip')).toBe(false);
    expect(matcher('')).toBe(false);
  });

  it('returns true for exact match even if also in CIDR', () => {
    const matcher = buildAllowlistMatcher(['10.0.0.0/8', '10.0.0.1']);
    expect(matcher('10.0.0.1')).toBe(true);
  });

  it('handles empty entries', () => {
    const matcher = buildAllowlistMatcher([]);
    expect(matcher('1.2.3.4')).toBe(false);
    expect(matcher('10.0.0.1')).toBe(false);
  });
});
