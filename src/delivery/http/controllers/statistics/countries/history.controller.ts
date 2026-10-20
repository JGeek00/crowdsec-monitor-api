import { Request, Response } from 'express';
import type { GetCountryHistoryParams, CountryHistory, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/application/container';

/**
 * Get country history (alerts grouped by date for a specific country)
 */
type Res = ResponseWithError<CountryHistory[]>;
export async function getCountryHistory(req: Request<GetCountryHistoryParams>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { item } = req.params;
    const history = await container.useCases.statistics.getCountryHistory.execute(String(item).toUpperCase());
    res.json(history as CountryHistory[]);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(errorResponse('Error fetching country history', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
