import { Request, Response } from 'express';
import type { GetTopIpOwnersResponse, ResponseWithError } from '@/delivery/http/contracts';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';

/**
 * Get top IP owners statistics
 */
type Res = ResponseWithError<GetTopIpOwnersResponse[]>;
export async function getTopIpOwners(req: Request, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const ipOwners = await container.useCases.statistics.getTopIpOwners.execute();
    res.json(ipOwners as GetTopIpOwnersResponse[]);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(
        errorResponse('Error fetching IP owners statistics', error instanceof Error ? error.message : 'Unknown error'),
      );
  } finally {
    cleanup();
  }
}
