import { Request, Response } from 'express';
import { Alert } from '../../../models';
import { QueryTypes } from 'sequelize';

/**
 * Get scenario history (alerts grouped by date for a specific scenario)
 */
export async function getScenarioHistory(req: Request, res: Response): Promise<void> {
  try {
    const { item } = req.params;

    // Use raw SQL query to group by date
    const history = await Alert.sequelize!.query(
      `SELECT 
        strftime('%Y-%m-%d', crowdsec_created_at) as date,
        COUNT(*) as amount
      FROM Alerts
      WHERE scenario = :scenario
      GROUP BY strftime('%Y-%m-%d', crowdsec_created_at)
      ORDER BY date ASC`,
      {
        replacements: { scenario: item },
        type: QueryTypes.SELECT,
      }
    );

    res.json(history);
  } catch (error) {
    const response: any = {
      message: 'Error fetching scenario history',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  }
}
