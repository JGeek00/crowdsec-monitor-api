import { Request, Response } from 'express';
import { Decision } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { DB_SORTING } from '@/interfaces/database.interface';

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
        [Decision.sequelize!.fn('COUNT', Decision.sequelize!.col(Decision.col.id)), 'count'],
      ],
      group: ['type'],
      order: [[Decision.sequelize!.fn('COUNT', Decision.sequelize!.col(Decision.col.id)), DB_SORTING.DESC]],
    });

    const byScope = await Decision.findAll({
      attributes: [
        'scope',
        [Decision.sequelize!.fn('COUNT', Decision.sequelize!.col(Decision.col.id)), 'count'],
      ],
      group: ['scope'],
      order: [[Decision.sequelize!.fn('COUNT', Decision.sequelize!.col(Decision.col.id)), DB_SORTING.DESC]],
    });

    res.json({
      total,
      byType,
      byScope,
    });
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching decision statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
