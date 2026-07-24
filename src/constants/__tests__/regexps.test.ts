import { describe, it, expect } from 'vitest';
import { ipv4Regex, ipv6Regex, ipv4CidrRegex, ipv6CidrRegex } from '@/constants/regexps';

describe('ipv4Regex', () => {
  it('matches valid IPv4 addresses', () => {
    expect(ipv4Regex.test('192.168.1.1')).toBe(true);
    expect(ipv4Regex.test('0.0.0.0')).toBe(true);
    expect(ipv4Regex.test('255.255.255.255')).toBe(true);
    expect(ipv4Regex.test('10.0.0.1')).toBe(true);
    expect(ipv4Regex.test('172.16.0.1')).toBe(true);
  });

  it('rejects invalid IPv4 addresses', () => {
    expect(ipv4Regex.test('')).toBe(false);
    expect(ipv4Regex.test('not-an-ip')).toBe(false);
    expect(ipv4Regex.test('256.1.2.3')).toBe(false);
    expect(ipv4Regex.test('192.168.1')).toBe(false);
    expect(ipv4Regex.test('192.168.1.1.1')).toBe(false);
    expect(ipv4Regex.test('192.168.1.1/24')).toBe(false);
  });
});

describe('ipv6Regex', () => {
  it('matches valid IPv6 addresses', () => {
    expect(ipv6Regex.test('::1')).toBe(true);
    expect(ipv6Regex.test('2001:db8::1')).toBe(true);
    expect(ipv6Regex.test('fe80::1')).toBe(true);
    expect(ipv6Regex.test('ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
  });

  it('rejects invalid IPv6 addresses', () => {
    expect(ipv6Regex.test('')).toBe(false);
    expect(ipv6Regex.test('not-ipv6')).toBe(false);
    expect(ipv6Regex.test('1.2.3.4')).toBe(false);
    expect(ipv6Regex.test('::1/64')).toBe(false);
  });
});

describe('ipv4CidrRegex', () => {
  it('matches valid IPv4 CIDR notation', () => {
    expect(ipv4CidrRegex.test('192.168.1.0/24')).toBe(true);
    expect(ipv4CidrRegex.test('0.0.0.0/0')).toBe(true);
    expect(ipv4CidrRegex.test('255.255.255.255/32')).toBe(true);
    expect(ipv4CidrRegex.test('10.0.0.0/8')).toBe(true);
  });

  it('rejects invalid IPv4 CIDR notation', () => {
    expect(ipv4CidrRegex.test('192.168.1.0/33')).toBe(false);
    expect(ipv4CidrRegex.test('192.168.1.0')).toBe(false);
    expect(ipv4CidrRegex.test('not-a-cidr')).toBe(false);
    expect(ipv4CidrRegex.test('192.168.1.0/-1')).toBe(false);
  });
});

describe('ipv6CidrRegex', () => {
  it('matches valid IPv6 CIDR notation', () => {
    expect(ipv6CidrRegex.test('::0/0')).toBe(true);
    expect(ipv6CidrRegex.test('2001:db8::/32')).toBe(true);
    expect(ipv6CidrRegex.test('::1/128')).toBe(true);
    expect(ipv6CidrRegex.test('fe80::/10')).toBe(true);
  });

  it('rejects invalid IPv6 CIDR notation', () => {
    expect(ipv6CidrRegex.test('::1/129')).toBe(false);
    expect(ipv6CidrRegex.test('::1')).toBe(false);
    expect(ipv6CidrRegex.test('not-a-cidr')).toBe(false);
    expect(ipv6CidrRegex.test('::1/')).toBe(false);
  });
});
