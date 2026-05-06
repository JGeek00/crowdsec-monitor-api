import { Request, Response } from 'express';
import { AlertsTable, ResponseWithError, GetTopScenariosResponse } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { ScenarioCountRow } from '@/interfaces/statistics.interface';
import { DB_SORTING } from '@/types/database.types';

/**
 * Get top scenarios statistics
 */
type Res = ResponseWithError<GetTopScenariosResponse[]>;
export async function getTopScenarios(req: Request, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const scenariosData = await AlertsTable.findAll({
      attributes: [
        'scenario',
        [AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col(AlertsTable.col.id)), 'count'],
      ],
      group: ['scenario'],
      order: [[AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col(AlertsTable.col.id)), DB_SORTING.DESC]],
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
