import { Request, Response } from 'express';
import { crowdSecAPI } from '../../services';

/**
 * Check if IPs are in any allowlist
 */
export async function checkAllowlist(req: Request, res: Response): Promise<void> {
  try {
    const { ips } = req.body;

    const results = await crowdSecAPI.checkAllowlist(ips);

    res.status(200).json({
      results,
    });
  } catch (error) {
    console.error('Error checking allowlist:', error);
    res.status(500).json({
      error: 'Failed to check allowlist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
