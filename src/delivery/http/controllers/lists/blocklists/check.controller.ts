import { Request, Response } from 'express';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/application/container';

/**
 * Check if IPs are in any blocklist
 */
export async function checkBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { ips } = req.body as { ips: string[] };

    const result = await container.useCases.blocklists.checkIp.execute(ips);
    res.status(200).json(result);
  } catch (err) {
    log.error('Error checking blocklist:', err);
    res
      .status(500)
      .json(errorResponse('Failed to check blocklist', err instanceof Error ? err.message : 'Unknown error'));
  }
}
