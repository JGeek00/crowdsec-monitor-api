import { Request, Response } from 'express';
import { Alert, Decision } from '../../models';

/**
 * Get alert by ID with associated decisions
 */
export async function getAlertById(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const alert = await Alert.findByPk(id, {
      attributes: {
        exclude: ['created_at', 'updated_at']
      },
      include: [{
        model: Decision,
        as: 'decisions',
        attributes: {
          exclude: ['created_at', 'updated_at']
        },
      }],
    });

    if (!alert) {
      res.status(404).json({
        message: 'Alert not found',
      });
      return;
    }

    // Convert to plain object and remove timestamps
    const plainAlert: any = alert.toJSON();

    // Clean decisions if present
    if (plainAlert.decisions) {
      plainAlert.decisions = plainAlert.decisions.map((decision: any) => {
        return decision;
      });
    }

    res.json(plainAlert);
  } catch (error) {
    const response: any = {
      message: 'Error fetching alert',
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(500).json(response);
  }
}
