import { Request, Response } from 'express';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';
import type { GetAlertsStatsResponse, ResponseWithError } from '@/delivery/http/contracts';

/**
 * Get alerts statistics
 */
type Res = ResponseWithError<GetAlertsStatsResponse>;
export async function getAlertStats(req: Request<object, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const stats = await container.useCases.alerts.getAlertsStats.execute();
    res.json(stats);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(errorResponse('Error fetching alert statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
