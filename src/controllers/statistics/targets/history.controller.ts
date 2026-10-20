import { Request, Response } from 'express';
import type { GetTargetHistoryParams, TargetHistory, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/application/container';

/**
 * Get target history (alerts grouped by date for a specific target)
 */
type Res = ResponseWithError<TargetHistory[]>;
export async function getTargetHistory(req: Request<GetTargetHistoryParams>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { item } = req.params;
    const history = await container.useCases.statistics.getTargetHistory.execute(item);
    res.json(history as TargetHistory[]);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(errorResponse('Error fetching target history', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
