import { ipv4Regex } from '../constants/regexps';

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
