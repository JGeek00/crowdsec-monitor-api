import { Request, Response } from 'express';
import { crowdSecAPI } from '../../services';

/**
 * Get a specific allowlist by name from CrowdSec LAPI
 */
export async function getAllowlistByName(req: Request, res: Response): Promise<void> {
  try {
    const allowlist_name = req.params.allowlist_name as string;

    const allowlist = await crowdSecAPI.getAllowlistByName(allowlist_name);

    if (!allowlist) {
      res.status(404).json({
        error: 'Allowlist not found',
        message: `Allowlist '${allowlist_name}' was not found`,
      });
      return;
    }

    res.status(200).json({
      data: allowlist,
    });
  } catch (error) {
    console.error('Error fetching allowlist:', error);
    res.status(500).json({
      error: 'Failed to fetch allowlist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
