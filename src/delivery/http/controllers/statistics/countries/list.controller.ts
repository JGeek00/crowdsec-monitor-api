import { Request, Response } from 'express';
import type { GetTopCountriesResponse, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/application/container';

/**
 * Get top countries statistics
 */
type Res = ResponseWithError<GetTopCountriesResponse[]>;
export async function getTopCountries(req: Request, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const countries = await container.useCases.statistics.getTopCountries.execute();
    res.json(countries as GetTopCountriesResponse[]);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(
        errorResponse('Error fetching countries statistics', error instanceof Error ? error.message : 'Unknown error'),
      );
  } finally {
    cleanup();
  }
}
