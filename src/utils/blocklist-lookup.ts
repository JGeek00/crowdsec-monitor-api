import { Op } from 'sequelize';
import { BlocklistIp } from '../models';
import { isIpv4, isIpv4InCidr } from './ip';

/**
 * Look up which blocklist each IP belongs to (if any).
 * Returns a Map of ip -> blocklist_name for all matched IPs.
 */
export async function lookupIpsInBlocklists(ips: string[]): Promise<Map<string, string>> {
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

  const exactMatches = new Map<string, string>();
  const cidrEntries: Array<{ value: string; blocklist_name: string }> = [];

  for (const entry of entries) {
    if (entry.value.includes('/')) {
      cidrEntries.push({ value: entry.value, blocklist_name: entry.blocklist_name });
    } else if (!exactMatches.has(entry.value)) {
      exactMatches.set(entry.value, entry.blocklist_name);
    }
  }

  const result = new Map<string, string>();

  for (const ip of ips) {
    if (exactMatches.has(ip)) {
      result.set(ip, exactMatches.get(ip)!);
    } else if (isIpv4(ip)) {
      for (const cidr of cidrEntries) {
        if (isIpv4InCidr(ip, cidr.value)) {
          result.set(ip, cidr.blocklist_name);
          break;
        }
      }
    }
  }

  return result;
}
