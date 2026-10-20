import { Request, Response } from 'express';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/application/container';
import type { GetDecisionsStatsResponse, ResponseWithError } from '@/models';

/**
 * Get decisions statistics
 */
type Res = ResponseWithError<GetDecisionsStatsResponse>;
export async function getDecisionStats(req: Request<object, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const stats = await container.useCases.decisions.getDecisionsStats.execute();
    res.json(stats as GetDecisionsStatsResponse);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(
        errorResponse('Error fetching decision statistics', error instanceof Error ? error.message : 'Unknown error'),
      );
  } finally {
    cleanup();
  }
}
