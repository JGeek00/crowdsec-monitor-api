import { Request, Response } from 'express';
import { Decision } from '../../models';
import { createRequestSignal } from '../../utils/request-signal';

/**
 * Get decisions statistics
 */
export async function getDecisionStats(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const total = await Decision.count() as number;

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
    if (signal.aborted) return;
    const response: any = {
      message: 'Error fetching decision statistics',
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(500).json(response);
  } finally {
    cleanup();
  }
}
