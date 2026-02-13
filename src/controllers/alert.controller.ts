import { Request, Response } from 'express';
import { Alert } from '../models';
import { Op } from 'sequelize';

export class AlertController {
  /**
   * Get all alerts
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0, unpaged = false, scenario, simulated } = req.query;

      const where: any = {};
      
      if (scenario) {
        where.scenario = { [Op.like]: `%${scenario}%` };
      }
      
      if (simulated !== undefined) {
        where.simulated = simulated;
      }

      // Get total count
      const total = await Alert.count({ where });

      // Validate offset is not greater than total (only when paginated)
      if (!unpaged && (offset as number) > total) {
        res.status(400).json({
          success: false,
          message: `Invalid parameter: offset (${offset}) cannot be greater than total items (${total})`,
        });
        return;
      }
      
      const queryOptions: any = {
        where,
        order: [['created_at', 'DESC']],
      };

      // Apply pagination only if not unpaged
      if (!unpaged) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
      }

      const alerts = await Alert.findAll(queryOptions);

      const response: any = {
        success: true,
        data: alerts,
      };

      // Include pagination info only when paginated
      if (!unpaged) {
        const page = Math.floor((offset as number) / (limit as number)) + 1;
        response.pagination = {
          page,
          amount: alerts.length,
          total,
        };
      } else {
        response.total = total;
      }

      res.json(response);
    } catch (error) {
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
      res.status(500).json({
        success: false,
        message: 'Error fetching alert statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const alertController = new AlertController();
