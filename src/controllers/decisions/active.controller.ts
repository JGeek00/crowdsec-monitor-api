import { Request, Response } from 'express';
import { Decision } from '../../models';

/**
 * Get active decisions (decisions are considered based on their duration)
 * Note: Since CrowdSec only provides duration as a string (e.g., "4h", "1d"),
 * we cannot accurately determine if a decision is still active without parsing it.
 * This endpoint returns all recent decisions ordered by creation date.
 */
export async function getActiveDecisions(req: Request, res: Response): Promise<void> {
  try {
    const decisions = await Decision.findAll({
      order: [['created_at', 'DESC']],
      limit: 100, // Return last 100 decisions
    });

    res.json({
      items: decisions,
      count: decisions.length,
      note: 'Returns recent decisions. Active status cannot be determined without parsing duration strings.',
    });
  } catch (error) {
    const response: any = {
      message: 'Error fetching active decisions',
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(500).json(response);
  }
}
