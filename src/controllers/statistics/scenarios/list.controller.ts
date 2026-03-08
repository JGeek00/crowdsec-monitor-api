import { Request, Response } from 'express';
import { Alert } from '../../../models';
import { createRequestSignal } from '../../../utils/request-signal';

/**
 * Get top scenarios statistics
 */
export async function getTopScenarios(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const scenariosData = await Alert.findAll({
      signal,
      attributes: [
        'scenario',
        [Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'count'],
      ],
      group: ['scenario'],
      order: [[Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'DESC']],
      raw: true,
    });

    const scenarios = scenariosData.map((item: any) => ({
      scenario: item.scenario,
      amount: parseInt(item.count, 10),
    }));

    res.json(scenarios);
  } catch (error) {
    if (signal.aborted) return;
    const response: any = {
      message: 'Error fetching scenarios statistics',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  } finally {
    cleanup();
  }
}
