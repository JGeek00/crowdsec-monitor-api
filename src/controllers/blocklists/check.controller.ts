import { Request, Response } from 'express';
import { lookupIpsInBlocklists } from '../../utils/blocklist-lookup';

/**
 * Check if IPs are in any blocklist
 */
export async function checkBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { ips } = req.body as { ips: string[] };

    const blocklistMap = await lookupIpsInBlocklists(ips);
    const results = ips.map(ip => ({ ip, blocklist: blocklistMap.get(ip) ?? null }));

    res.status(200).json({ results });
  } catch (error) {
    console.error('Error checking blocklist:', error);
    res.status(500).json({
      error: 'Failed to check blocklist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
