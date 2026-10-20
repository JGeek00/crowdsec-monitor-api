import { Request, Response } from 'express';
import type { GetTopScenariosResponse, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';

/**
 * Get top scenarios statistics
 */
type Res = ResponseWithError<GetTopScenariosResponse[]>;
export async function getTopScenarios(req: Request, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const scenarios = await container.useCases.statistics.getTopScenarios.execute();
    res.json(scenarios as GetTopScenariosResponse[]);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(
        errorResponse('Error fetching scenarios statistics', error instanceof Error ? error.message : 'Unknown error'),
      );
  } finally {
    cleanup();
  }
}
