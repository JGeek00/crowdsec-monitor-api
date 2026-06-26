import { Request, Response } from 'express';
import { lookupIpsInBlocklists } from '@/utils/blocklist-lookup';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';

/**
 * Check if IPs are in any blocklist
 */
export async function checkBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { ips } = req.body as { ips: string[] };

    const blocklistMap = await lookupIpsInBlocklists(ips);
    const results = ips.map((ip) => ({ ip, blocklists: blocklistMap.get(ip) ?? [] }));

    res.status(200).json({ results });
  } catch (err) {
    log.error('Error checking blocklist:', err);
    res
      .status(500)
      .json(errorResponse('Failed to check blocklist', err instanceof Error ? err.message : 'Unknown error'));
  }
}
