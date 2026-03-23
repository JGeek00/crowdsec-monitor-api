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

    let lastIpIndex = -1;
    for (let i = hopResults.length - 1; i >= 0; i--) {
      if (hopResults[i].ip !== null) { lastIpIndex = i; break; }
    }
    const trimmedHops = lastIpIndex >= 0 ? hopResults.slice(0, lastIpIndex + 1) : hopResults;

    res.status(200).json({
      domain,
      reachable,
      hops: trimmedHops,
    });
  } catch (error) {
    console.error('Error checking domain blocklist:', error);
    res.status(500).json({
      error: 'Failed to check domain blocklist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
