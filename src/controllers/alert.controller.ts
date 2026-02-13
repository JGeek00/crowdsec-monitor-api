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
        items: alerts,
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
      const response: any = {
        message: 'Error fetching alerts',
      };
      
      if (process.env.NODE_ENV !== 'production') {
        response.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      res.status(500).json(response);
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

      // Get all alerts with source information for grouping
      const allAlerts = await Alert.findAll({
        attributes: ['source'],
      });

      // Group by country
      const countryMap = new Map<string, number>();
      const organizationMap = new Map<string, number>();

      allAlerts.forEach(alert => {
        if (alert.source) {
          // Count by country
          const country = alert.source.cn;
          if (country) {
            countryMap.set(country, (countryMap.get(country) || 0) + 1);
          }

          // Count by organization
          const organization = alert.source.as_name;
          if (organization) {
            organizationMap.set(organization, (organizationMap.get(organization) || 0) + 1);
          }
        }
      });

      // Convert maps to sorted arrays
      const topCountries = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topOrganizations = Array.from(organizationMap.entries())
        .map(([organization, count]) => ({ organization, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      res.json({
        total,
        simulated,
        real,
        topScenarios,
        topCountries,
        topOrganizations,
      });
    } catch (error) {
      const response: any = {
        message: 'Error fetching alert statistics',
      };
      
      if (process.env.NODE_ENV !== 'production') {
        response.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      res.status(500).json(response);
    }
  }
}

export const alertController = new AlertController();
