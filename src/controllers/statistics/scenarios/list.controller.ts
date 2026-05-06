import { Request, Response } from 'express';
import { AlertDb } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { ScenarioCountRow } from '@/interfaces/statistics.interface';
import { DB_SORTING } from '@/interfaces/database.interface';

/**
 * Get top scenarios statistics
 */
export async function getTopScenarios(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const scenariosData = await AlertDb.findAll({
      attributes: [
        'scenario',
        [AlertDb.sequelize!.fn('COUNT', AlertDb.sequelize!.col(AlertDb.col.id)), 'count'],
      ],
      group: ['scenario'],
      order: [[AlertDb.sequelize!.fn('COUNT', AlertDb.sequelize!.col(AlertDb.col.id)), DB_SORTING.DESC]],
      raw: true,
    });

    const scenarios = (scenariosData as unknown as ScenarioCountRow[]).map((item) => ({
      scenario: item.scenario,
      amount: parseInt(item.count, 10),
    }));

    res.json(scenarios);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching scenarios statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
