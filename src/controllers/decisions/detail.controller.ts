import { Request, Response } from 'express';
import { Decision } from '../../models';

/**
 * Get decision by ID
 */
export async function getDecisionById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const decision = await Decision.findByPk(id);

    if (!decision) {
      res.status(404).json({
        message: 'Decision not found',
      });
      return;
    }

    res.json(decision);
  } catch (error) {
    const response: any = {
      message: 'Error fetching decision',
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(500).json(response);
  }
}
