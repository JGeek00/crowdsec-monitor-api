/**
 * Count the number of individual IPs represented by a value.
 * For IPv4 CIDR notation (e.g. "1.2.3.0/24"): returns 2^(32 - prefix).
 * For a plain IP address: returns 1.
 */
export function countIpsInValue(value: string): number {
  const cidrMatch = value.match(/\/(\d{1,2})$/);
  if (cidrMatch) {
    const prefix = parseInt(cidrMatch[1], 10);
    if (prefix >= 0 && prefix <= 32) {
      return Math.pow(2, 32 - prefix);
    }
  }
  return 1;
}
