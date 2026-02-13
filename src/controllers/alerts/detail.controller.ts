import { Request, Response } from 'express';
import { Alert } from '../../models';

/**
 * Get alert by ID
 */
export async function getAlertById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const alert = await Alert.findByPk(id);

    if (!alert) {
      res.status(404).json({
        message: 'Alert not found',
      });
      return;
    }

    res.json(alert);
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
