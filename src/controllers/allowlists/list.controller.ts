import { Request, Response } from 'express';
import { crowdSecAPI } from '../../services';

/**
 * Get all allowlists from CrowdSec LAPI
 */
export async function getAllowlists(req: Request, res: Response): Promise<void> {
  try {
    const allowlists = await crowdSecAPI.getAllowlists();
    
    res.status(200).json({
      data: allowlists,
      length: allowlists.length,
    });
  } catch (error) {
    console.error('Error fetching allowlists:', error);
    res.status(500).json({
      error: 'Failed to fetch allowlists',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
