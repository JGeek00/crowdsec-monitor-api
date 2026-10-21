import { Request, Response } from 'express';
import type { GetScenarioHistoryParams, ScenarioHistory, ResponseWithError } from '@/delivery/http/contracts';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';

/**
 * Get scenario history (alerts grouped by date for a specific scenario)
 */
type Res = ResponseWithError<ScenarioHistory[]>;
export async function getScenarioHistory(req: Request<GetScenarioHistoryParams>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { item } = req.params;
    const history = await container.useCases.statistics.getScenarioHistory.execute(item);
    res.json(history as ScenarioHistory[]);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(errorResponse('Error fetching scenario history', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
