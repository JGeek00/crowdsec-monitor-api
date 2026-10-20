import { Request, Response } from 'express';
import type { GetStatisticsQueryParams, GetStatisticsResponse, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';

/**
 * Get comprehensive statistics
 */
type Res = ResponseWithError<GetStatisticsResponse>;
export async function getStatistics(
  req: Request<object, Res, object, GetStatisticsQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { since, amount } = req.query;
    const result = await container.useCases.statistics.getGeneralStatistics.execute(
      since,
      amount ? Number(amount) : undefined,
    );
    res.json(result as GetStatisticsResponse);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(errorResponse('Error fetching statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
