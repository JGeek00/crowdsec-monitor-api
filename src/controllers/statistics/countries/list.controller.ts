import { Request, Response } from 'express';
import { AlertsTable } from '@/models/db';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { Alert_SourceInfo } from '@/models';

/**
 * Get top countries statistics
 */
export async function getTopCountries(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const alertsWithSource = await AlertsTable.findAll({
      attributes: ['source'],
      raw: true,
    });

    const countryMap = new Map<string, number>();

    (alertsWithSource).forEach((alert) => {
      if (alert.source) {
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) as Alert_SourceInfo : alert.source;
        if (source.cn) {
          countryMap.set(source.cn, (countryMap.get(source.cn) || 0) + 1);
        }
      }
    });

    const countries = Array.from(countryMap.entries())
      .map(([countryCode, amount]) => ({ countryCode, amount }))
      .sort((a, b) => b.amount - a.amount);

    res.json(countries);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching countries statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
