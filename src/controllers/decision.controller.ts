import { Request, Response } from 'express';
import { Decision } from '../models';
import { Op } from 'sequelize';

export class DecisionController {
  /**
   * Get all decisions
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0, unpaged = false, type, scope, value, simulated } = req.query;

      const where: any = {};
      
      if (type) {
        where.type = type;
      }
      
      if (scope) {
        where.scope = scope;
      }
      
      if (value) {
        where.value = { [Op.like]: `%${value}%` };
      }
      
      if (simulated !== undefined) {
        where.simulated = simulated;
      }

      // Get total count
      const total = await Decision.count({ where });

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

      const decisions = await Decision.findAll(queryOptions);

      const response: any = {
        items: decisions,
      };

      // Include pagination info only when paginated
      if (!unpaged) {
        const page = Math.floor((offset as number) / (limit as number)) + 1;
        response.pagination = {
          page,
          amount: decisions.length,
          total,
        };
      } else {
        response.total = total;
      }

      res.json(response);
    } catch (error) {
      const response: any = {
        message: 'Error fetching decisions',
      };
      
      if (process.env.NODE_ENV !== 'production') {
        response.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      res.status(500).json(response);
    }
  }

  /**
   * Get decision by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
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

  /**
   * Get active decisions (decisions are considered based on their duration)
   * Note: Since CrowdSec only provides duration as a string (e.g., "4h", "1d"),
   * we cannot accurately determine if a decision is still active without parsing it.
   * This endpoint returns all recent decisions ordered by creation date.
   */
  async getActive(req: Request, res: Response): Promise<void> {
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

  /**
   * Get decisions statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const total = await Decision.count();

      const byType = await Decision.findAll({
        attributes: [
          'type',
          [Decision.sequelize!.fn('COUNT', Decision.sequelize!.col('id')), 'count'],
        ],
        group: ['type'],
        order: [[Decision.sequelize!.fn('COUNT', Decision.sequelize!.col('id')), 'DESC']],
      });

      const byScope = await Decision.findAll({
        attributes: [
          'scope',
          [Decision.sequelize!.fn('COUNT', Decision.sequelize!.col('id')), 'count'],
        ],
        group: ['scope'],
        order: [[Decision.sequelize!.fn('COUNT', Decision.sequelize!.col('id')), 'DESC']],
      });

      res.json({
        total,
        byType,
        byScope,
      });
    } catch (error) {
      const response: any = {
        message: 'Error fetching decision statistics',
      };
      
      if (process.env.NODE_ENV !== 'production') {
        response.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      res.status(500).json(response);
    }
  }
}

export const decisionController = new DecisionController();
