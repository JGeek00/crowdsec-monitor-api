import { Request, Response } from 'express';
import { Alert } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { AlertRaw, SourceInfo } from '@/interfaces/alert.interface';

/**
 * Get top IP owners statistics
 */
export async function getTopIpOwners(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const alertsWithSource = await Alert.findAll({
      attributes: ['source'],
      raw: true,
    });

    const ipOwnerMap = new Map<string, number>();

    (alertsWithSource as unknown as AlertRaw[]).forEach((alert) => {
      if (alert.source) {
        const source = typeof alert.source === 'string' ? JSON.parse(alert.source) as SourceInfo : alert.source;
        if (source.as_name) {
          ipOwnerMap.set(source.as_name, (ipOwnerMap.get(source.as_name) || 0) + 1);
        }
      }
    });

    const ipOwners = Array.from(ipOwnerMap.entries())
      .map(([ipOwner, amount]) => ({ ipOwner, amount }))
      .sort((a, b) => b.amount - a.amount);

    res.json(ipOwners);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching IP owners statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
