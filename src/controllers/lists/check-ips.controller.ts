import { Request, Response } from 'express';
import { PostCheckIpsInListBody, PostCheckIpsInListResult, ResponseWithError } from '@/models';
import { isIpv4 } from '@/utils/ip';
import { ipv6Regex } from '@/constants/regexps';
import { lookupIpsInBlocklists } from '@/utils/blocklist-lookup';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';
import { lookupIpsInAllowlists } from '@/utils/allowlist-lookup';

/**
 * Check if IPs are in any list (blocklist or allowlist)
 */
type Res = ResponseWithError<PostCheckIpsInListResult>;
export async function checkIpsInList(req: Request<{}, Res, PostCheckIpsInListBody>, res: Response<Res>): Promise<void> {
  try {
    const { ips } = req.body;
    
    if (!Array.isArray(ips) || ips.some(ip => typeof ip !== 'string')) {
      res.status(400).json(errorResponse('Invalid input', 'Field "ips" must be an array of strings'));
      return;
    }

    const invalidIps = ips.filter(ip => !(isIpv4(ip) || ipv6Regex.test(ip)));
    if (invalidIps.length > 0) {
      res.status(400).json(errorResponse('Invalid IPs', `Invalid IP addresses: ${invalidIps.join(', ')}`));
      return;
    }

    const [blocklistMap, allowlistMap] = await Promise.all([
      lookupIpsInBlocklists(ips),
      lookupIpsInAllowlists(ips),
    ]);
    
    const results = ips.map(ip => ({
      ip,
      blocklists: blocklistMap.get(ip) ?? [],
      allowlists: allowlistMap.get(ip) ?? []
    }));

    res.status(200).json({ results });
  } catch (err) {
    log.error('Error checking lists:', err);
    res.status(500).json(errorResponse('Failed to check lists', err instanceof Error ? err.message : 'Unknown error'));
  }
}
