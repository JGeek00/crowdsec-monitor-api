import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { BlocklistIp } from '../../models';
import { isIpv4, isIpv4InCidr } from '../../utils/ip';

/**
 * Check if IPs are in any blocklist
 */
export async function checkBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { ips } = req.body as { ips: string[] };

    // Fetch exact matches and all CIDR entries in one query
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

    const results = ips.map((ip) => {
      if (exactMatches.has(ip)) {
        return { ip, blocklist: exactMatches.get(ip)! };
      }
      if (isIpv4(ip)) {
        for (const cidr of cidrEntries) {
          if (isIpv4InCidr(ip, cidr.value)) {
            return { ip, blocklist: cidr.blocklist_name };
          }
        }
      }
      return { ip, blocklist: null };
    });

    res.status(200).json({ results });
  } catch (error) {
    console.error('Error checking blocklist:', error);
    res.status(500).json({
      error: 'Failed to check blocklist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
