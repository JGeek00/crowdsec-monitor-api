import { Request, Response } from 'express';
import { Decision, Alert } from '../../models';

/**
 * Get decision by ID with associated alert
 */
export async function getDecisionById(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const decision = await Decision.findByPk(id, {
      attributes: {
        exclude: ['created_at', 'updated_at']
      },
      include: [{
        model: Alert,
        as: 'alert',
        attributes: {
          exclude: ['created_at', 'updated_at']
        },
      }],
    });

    if (!decision) {
      res.status(404).json({
        message: 'Decision not found',
      });
      return;
    }

    // Convert to plain object and remove timestamps
    const plainDecision: any = decision.toJSON();
    res.json(plainDecision);
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
