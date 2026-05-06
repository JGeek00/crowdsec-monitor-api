import { Request, Response } from 'express';
import { DecisionsTable, GetDecisionsStatsResponse, GetDecisionsStatsResponse_ByScope, GetDecisionsStatsResponse_ByType, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { DB_SORTING } from '@/interfaces/database.interface';

/**
 * Get decisions statistics
 */
type Res = ResponseWithError<GetDecisionsStatsResponse>;
export async function getDecisionStats(req: Request<{}, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const total = await DecisionsTable.count() as number;

    const byType = await DecisionsTable.findAll({
      attributes: [
        'type',
        [DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), 'count'],
      ],
      group: ['type'],
      order: [[DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), DB_SORTING.DESC]],
    }) as unknown as GetDecisionsStatsResponse_ByType[];

    const byScope = await DecisionsTable.findAll({
      attributes: [
        'scope',
        [DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), 'count'],
      ],
      group: ['scope'],
      order: [[DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), DB_SORTING.DESC]],
    }) as unknown as GetDecisionsStatsResponse_ByScope[];

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
