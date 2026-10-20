import { Request, Response } from 'express';
import type { PostCheckIpsInListBody, PostCheckIpsInListResult, ResponseWithError } from '@/models';
import { isIpv4 } from '@/shared/utils/ip';
import { ipv6Regex } from '@/constants/regexps';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';

/**
 * Check if IPs are in any list (blocklist or allowlist)
 */
type Res = ResponseWithError<PostCheckIpsInListResult>;
export async function checkIpsInList(
  req: Request<object, Res, PostCheckIpsInListBody>,
  res: Response<Res>,
): Promise<void> {
  try {
    const { ips } = req.body;

    if (!Array.isArray(ips) || ips.some((ip) => typeof ip !== 'string')) {
      res.status(400).json(errorResponse('Invalid input', 'Field "ips" must be an array of strings'));
      return;
    }

    const invalidIps = ips.filter((ip) => !(isIpv4(ip) || ipv6Regex.test(ip)));
    if (invalidIps.length > 0) {
      res.status(400).json(errorResponse('Invalid IPs', `Invalid IP addresses: ${invalidIps.join(', ')}`));
      return;
    }

    const result = await container.useCases.blocklists.checkIpsInList.execute(ips);
    res.status(200).json(result as PostCheckIpsInListResult);
  } catch (err) {
    log.error('Error checking lists:', err);
    res.status(500).json(errorResponse('Failed to check lists', err instanceof Error ? err.message : 'Unknown error'));
  }
}
