import { Request, Response } from 'express';
import type { GetCountryHistoryParams, CountryHistory, ResponseWithError } from '@/delivery/http/contracts';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';

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
