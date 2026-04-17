import { isIpv4, isIpv4InCidr } from '@/utils/ip';
import { crowdSecAPI } from '@/services';

/**
 * Look up which allowlist each IP belongs to (if any).
 * Returns a Map of ip -> allowlist_name[] for all matched IPs.
 */
export async function lookupIpsInAllowlists(ips: string[]): Promise<Map<string, string[]>> {
  if (ips.length === 0) return new Map();

  const allowlists = await crowdSecAPI.allowlists.getAllowlists();

  const exactMatches = new Map<string, string[]>();
  const cidrEntries: Array<{ value: string; allowlist_name: string }> = [];

  for (const allowlist of allowlists) {
    const name = allowlist.name;
    for (const item of allowlist.items || []) {
      const value = item.value;
      if (value.includes('/')) {
        cidrEntries.push({ value, allowlist_name: name });
      } else {
        const existing = exactMatches.get(value) ?? [];
        if (!existing.includes(name)) existing.push(name);
        exactMatches.set(value, existing);
      }
    }
  }

  const result = new Map<string, string[]>();

  for (const ip of ips) {
    const matched: string[] = [...(exactMatches.get(ip) ?? [])];

    if (isIpv4(ip)) {
      for (const cidr of cidrEntries) {
        if (isIpv4InCidr(ip, cidr.value) && !matched.includes(cidr.allowlist_name)) {
          matched.push(cidr.allowlist_name);
        }
      }
    }

    if (matched.length > 0) {
      result.set(ip, matched);
    }
  }

  return result;
}
