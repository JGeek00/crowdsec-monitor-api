import { Request, Response } from 'express';
import { crowdSecAPI } from '@/services';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';

/**
 * Check if IPs are in any allowlist
 */
export async function checkAllowlist(req: Request, res: Response): Promise<void> {
  try {
    const { ips } = req.body;

    const results = await crowdSecAPI.allowlists.checkAllowlist(ips);

    res.status(200).json({
      results,
    });
  } catch (err) {
    log.error('Error checking allowlist:', err);
    res.status(500).json(errorResponse('Failed to check allowlist', err instanceof Error ? err.message : 'Unknown error'));
  }
}
