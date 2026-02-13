import { Request, Response } from 'express';
import { Alert } from '../models';
import { Op } from 'sequelize';

export class AlertController {
  /**
   * Get all alerts
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0, scenario, simulated } = req.query;

      const where: any = {};
      
      if (scenario) {
        where.scenario = { [Op.like]: `%${scenario}%` };
      }
      
      if (simulated !== undefined) {
        where.simulated = simulated === 'true';
      }

      const alerts = await Alert.findAll({
        where,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        order: [['created_at', 'DESC']],
      });

      const total = await Alert.count({ where });

      res.json({
        success: true,
        data: alerts,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get alert by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const alert = await Alert.findByPk(id);

      if (!alert) {
        res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
        return;
      }

      res.json({
        success: true,
        data: alert,
      });
    } catch (error) {
      console.error('Error fetching alert:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching alert',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get alerts statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const total = await Alert.count();
      const simulated = await Alert.count({ where: { simulated: true } });
      const real = total - simulated;

      const topScenarios = await Alert.findAll({
        attributes: [
          'scenario',
          [Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'count'],
        ],
        group: ['scenario'],
        order: [[Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'DESC']],
        limit: 10,
      });

      res.json({
        success: true,
        data: {
          total,
          simulated,
          real,
          topScenarios,
        },
      });
    } catch (error) {
      console.error('Error fetching alert stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching alert statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const alertController = new AlertController();
