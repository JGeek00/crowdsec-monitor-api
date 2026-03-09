import { Request, Response } from 'express';
import { Alert } from '../../../models';
import { createRequestSignal } from '../../../utils/request-signal';

/**
 * Get IP owner history (alerts grouped by date for a specific IP owner)
 */
export async function getIpOwnerHistory(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { item } = req.params;

    // Get all alerts with their dates and sources
    const alerts = await Alert.findAll({
      attributes: ['crowdsec_created_at', 'source'],
      raw: true,
    });

    // Filter by IP owner and group by date in JavaScript
    const dateMap = new Map<string, number>();

    alerts.forEach((alert: any) => {
      if (alert.source) {
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) : alert.source;
        if (source.as_name && source.as_name === item) {
          const date = new Date(alert.crowdsec_created_at).toISOString().split('T')[0];
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        }
      }
    });

    // Convert to array and sort by date
    const history = Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(history);
  } catch (error) {
    if (signal.aborted) return;
    const response: any = {
      message: 'Error fetching IP owner history',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.status(500).json(response);
  } finally {
    cleanup();
  }
}
