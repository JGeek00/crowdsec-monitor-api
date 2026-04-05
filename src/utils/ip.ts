import { ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex } from '@/constants/regexps';

export function isIpv4(ip: string): boolean {
  return ipv4Regex.test(ip);
}

export function ipToInt32(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isIpv4InCidr(ip: string, cidr: string): boolean {
  try {
    const [range, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipToInt32(ip) & mask) === (ipToInt32(range) & mask);
  } catch {
    return false;
  }
}

function expandIpv6(ip: string): string {
  if (ip.includes('::')) {
    const [left, right] = ip.split('::');
    const leftParts = left ? left.split(':') : [];
    const rightParts = right ? right.split(':') : [];
    const missing = 8 - leftParts.length - rightParts.length;
    const middle = Array(missing).fill('0000');
    return [...leftParts, ...middle, ...rightParts].map(p => p.padStart(4, '0')).join(':');
  }
  return ip.split(':').map(p => p.padStart(4, '0')).join(':');
}

function ipv6ToBigInt(ip: string): bigint {
  const expanded = expandIpv6(ip);
  return expanded.split(':').reduce((acc: bigint, part: string) => (acc << 16n) | BigInt(parseInt(part, 16)), 0n);
}

export function isIpv6InCidr(ip: string, cidr: string): boolean {
  try {
    const slashIdx = cidr.lastIndexOf('/');
    const range = cidr.slice(0, slashIdx);
    const prefix = parseInt(cidr.slice(slashIdx + 1), 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 128) return false;
    const mask = prefix === 0 ? 0n : ((1n << 128n) - 1n) & ~((1n << BigInt(128 - prefix)) - 1n);
    return (ipv6ToBigInt(ip) & mask) === (ipv6ToBigInt(range) & mask);
  } catch {
    return false;
  }
}

/**
 * Pre-processes allowlist entries into an efficient matcher function.
 * Handles exact matches, IPv4 in CIDR, and IPv6 in CIDR.
 */
export function buildAllowlistMatcher(allowlistEntries: string[]): (value: string) => boolean {
  const exactSet = new Set(allowlistEntries);
  const v4Cidrs = allowlistEntries.filter(e => ipv4CidrRegex.test(e));
  const v6Cidrs = allowlistEntries.filter(e => ipv6CidrRegex.test(e));

  return (value: string): boolean => {
    if (exactSet.has(value)) return true;
    if (ipv4Regex.test(value)) {
      return v4Cidrs.some(cidr => isIpv4InCidr(value, cidr));
    }
    if (ipv6Regex.test(value)) {
      return v6Cidrs.some(cidr => isIpv6InCidr(value, cidr));
    }
    return false;
  };
}
