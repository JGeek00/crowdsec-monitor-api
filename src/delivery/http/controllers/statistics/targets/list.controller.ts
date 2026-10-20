import { Request, Response } from 'express';
import type { GetTopTargetsResponse, ResponseWithError } from '@/delivery/http/contracts';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';

/**
 * Get top targets statistics
 */
type Res = ResponseWithError<GetTopTargetsResponse[]>;
export async function getTopTargets(req: Request, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const targets = await container.useCases.statistics.getTopTargets.execute();
    res.json(targets as GetTopTargetsResponse[]);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(
        errorResponse('Error fetching targets statistics', error instanceof Error ? error.message : 'Unknown error'),
      );
  } finally {
    cleanup();
  }
}
