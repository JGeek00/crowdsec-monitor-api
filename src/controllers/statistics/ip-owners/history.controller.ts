import { Request, Response } from 'express';
import { Alert_SourceInfo, AlertsTable, GetIpOwnerHistoryParams, IpOwnerHistory, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';

/**
 * Get IP owner history (alerts grouped by date for a specific IP owner)
 */
type Res = ResponseWithError<IpOwnerHistory[]>;
export async function getIpOwnerHistory(req: Request<GetIpOwnerHistoryParams>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { item } = req.params;

    // Get all alerts with their dates and sources
    const alerts = await AlertsTable.findAll({
      attributes: [AlertsTable.col.crowdsecCreatedAt, AlertsTable.col.source],
      raw: true,
    });

    // Filter by IP owner and group by date in JavaScript
    const dateMap = new Map<string, number>();

    (alerts).forEach((alert) => {
      if (alert.source) {
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) as Alert_SourceInfo : alert.source;
        if (source.as_name && source.as_name === item) {
          const date = new Date(alert.crowdsec_created_at as Date | string).toISOString().split('T')[0];
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
    res.status(500).json(errorResponse('Error fetching IP owner history', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
