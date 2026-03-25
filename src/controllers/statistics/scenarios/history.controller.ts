import { Request, Response } from 'express';
import { Alert } from '@/models';
import { QueryTypes } from 'sequelize';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';

/**
 * Get scenario history (alerts grouped by date for a specific scenario)
 */
export async function getScenarioHistory(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { item } = req.params;

    // Use raw SQL query to group by date — DATE() works on both SQLite and PostgreSQL
    const history = await Alert.sequelize!.query(
      `SELECT 
        DATE(crowdsec_created_at) as date,
        COUNT(*) as amount
      FROM alerts
      WHERE scenario = :scenario
      GROUP BY DATE(crowdsec_created_at)
      ORDER BY date ASC`,
      {
        replacements: { scenario: item },
        type: QueryTypes.SELECT,
      }
    );

    res.json(history);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching scenario history', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
