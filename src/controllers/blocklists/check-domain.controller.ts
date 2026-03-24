import { Request, Response } from 'express';
import { lookupIpsInBlocklists } from '../../utils/blocklist-lookup';
import { resolveIps } from '../../utils/dns-resolve';
import { config } from '../../config';
import { errorResponse } from '../../utils/error-response';

/**
 * Resolve DNS for a domain using the configured DNS server and check if any
 * resolved IP is in any blocklist.
 */
export async function checkDomainBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { domain } = req.body as { domain: string };

    const ips = await resolveIps(domain, config.dns.server);

    if (ips.length === 0) {
      res.status(422).json(errorResponse('Unprocessable entity', 'Could not resolve domain to any IP address'));
      return;
    }

    const blocklistMap = await lookupIpsInBlocklists(ips);
    const results = ips.map(ip => ({ ip, blocklists: blocklistMap.get(ip) ?? [] }));

    res.status(200).json({ domain, ips: results });
  } catch (error) {
    console.error('Error checking domain blocklist:', error);
    res.status(500).json(errorResponse('Failed to check domain blocklist', error instanceof Error ? error.message : 'Unknown error'));
  }
}
