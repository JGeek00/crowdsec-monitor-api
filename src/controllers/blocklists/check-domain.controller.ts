import { Request, Response } from 'express';
import { runTraceroute } from '../../utils/traceroute';
import { lookupIpsInBlocklists } from '../../utils/blocklist-lookup';

/**
 * Run a traceroute to a domain and check if any hop IP is in any blocklist
 */
export async function checkDomainBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { domain } = req.body as { domain: string };

    const { hops, reachable } = await runTraceroute(domain);

    const realIps = hops.filter(h => h.ip !== null).map(h => h.ip as string);
    const blocklistMap = await lookupIpsInBlocklists(realIps);

    const hopResults = hops.map(h => ({
      hop: h.hop,
      ip: h.ip,
      timed_out: h.timed_out,
      blocklist: h.ip ? (blocklistMap.get(h.ip) ?? null) : null,
    }));

    const blocked_ips = hopResults.filter(h => h.blocklist !== null);

    res.status(200).json({
      domain,
      reachable,
      hops: hopResults,
      blocked_ips,
    });
  } catch (error) {
    console.error('Error checking domain blocklist:', error);
    res.status(500).json({
      error: 'Failed to check domain blocklist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
