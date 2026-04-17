import { Request, Response } from 'express';
import { crowdSecAPI } from '@/services';
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
  } catch (error) {
    console.error('Error checking allowlist:', error);
    res.status(500).json(errorResponse('Failed to check allowlist', error instanceof Error ? error.message : 'Unknown error'));
  }
}
