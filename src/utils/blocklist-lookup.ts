import { Op } from 'sequelize';
import { BlocklistIp } from '../models';
import { isIpv4, isIpv4InCidr } from './ip';

/**
 * Look up which blocklist each IP belongs to (if any).
 * Returns a Map of ip -> blocklist_name for all matched IPs.
 */
export async function lookupIpsInBlocklists(ips: string[]): Promise<Map<string, string[]>> {
  if (ips.length === 0) return new Map();

  const entries = await BlocklistIp.findAll({
    where: {
      [Op.or]: [
        { value: ips },
        { value: { [Op.like]: '%/%' } },
      ],
    },
    attributes: ['value', 'blocklist_name'],
  });

  const exactMatches = new Map<string, string[]>();
  const cidrEntries: Array<{ value: string; blocklist_name: string }> = [];

  for (const entry of entries) {
    if (entry.value.includes('/')) {
      cidrEntries.push({ value: entry.value, blocklist_name: entry.blocklist_name });
    } else {
      const existing = exactMatches.get(entry.value) ?? [];
      if (!existing.includes(entry.blocklist_name)) {
        existing.push(entry.blocklist_name);
      }
      exactMatches.set(entry.value, existing);
    }
  }

  const result = new Map<string, string[]>();

  for (const ip of ips) {
    const matched: string[] = [...(exactMatches.get(ip) ?? [])];

    if (isIpv4(ip)) {
      for (const cidr of cidrEntries) {
        if (isIpv4InCidr(ip, cidr.value) && !matched.includes(cidr.blocklist_name)) {
          matched.push(cidr.blocklist_name);
        }
      }
    }

    if (matched.length > 0) {
      result.set(ip, matched);
    }
  }

  return result;
}
