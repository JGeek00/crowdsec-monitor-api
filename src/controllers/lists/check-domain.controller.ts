import { Request, Response } from 'express';
import { lookupIpsInBlocklists } from '@/utils/blocklist-lookup';
import { lookupIpsInAllowlists } from '@/utils/allowlist-lookup';
import { resolveIps } from '@/utils/dns-resolve';
import { config } from '@/config';
import { errorResponse } from '@/utils/error-response';
import { PostCheckDomainBody, PostCheckDomainResponse, PostCheckDomainResponse_IP, ResponseWithError } from '@/models';

/**
 * Resolve DNS for a domain using the configured DNS server and check if any
 * resolved IP is in any list (blocklist or allowlist).
 */
type Res = ResponseWithError<PostCheckDomainResponse>;
export async function checkDomainInList(req: Request<{}, Res, PostCheckDomainBody>, res: Response<Res>): Promise<void> {
  try {
    const { domain } = req.body;

    const ips = await resolveIps(domain, config.dns.server);

    if (ips.length === 0) {
      res.status(422).json(errorResponse('Unprocessable entity', 'Could not resolve domain to any IP address'));
      return;
    }

    const [blocklistMap, allowlistMap] = await Promise.all([
      lookupIpsInBlocklists(ips),
      lookupIpsInAllowlists(ips),
    ]);

    const results: PostCheckDomainResponse_IP[] = ips.map(ip => ({
      ip,
      blocklists: blocklistMap.get(ip) ?? [],
      allowlists: allowlistMap.get(ip) ?? [],
    }));

    res.status(200).json({ domain, ips: results });
  } catch (error) {
    console.error('Error checking domain in lists:', error);
    res.status(500).json(errorResponse('Failed to check domain in lists', error instanceof Error ? error.message : 'Unknown error'));
  }
}
