import { Request, Response } from 'express';
import { Decision } from '../models';
import { Op } from 'sequelize';

export class DecisionController {
  /**
   * Get all decisions
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0, type, scope, value, simulated } = req.query;

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
        where.simulated = simulated === 'true';
      }

      const decisions = await Decision.findAll({
        where,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        order: [['created_at', 'DESC']],
      });

      const total = await Decision.count({ where });

      res.json({
        success: true,
        data: decisions,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error) {
      console.error('Error fetching decisions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching decisions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
          success: false,
          message: 'Decision not found',
        });
        return;
      }

      res.json({
        success: true,
        data: decision,
      });
    } catch (error) {
      console.error('Error fetching decision:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching decision',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
        success: true,
        data: decisions,
        count: decisions.length,
        note: 'Returns recent decisions. Active status cannot be determined without parsing duration strings.',
      });
    } catch (error) {
      console.error('Error fetching active decisions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching active decisions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
        success: true,
        data: {
          total,
          byType,
          byScope,
        },
      });
    } catch (error) {
      console.error('Error fetching decision stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching decision statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const decisionController = new DecisionController();
