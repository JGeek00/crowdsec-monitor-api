import { Request, Response } from 'express';
import type { GetIpOwnerHistoryParams, IpOwnerHistory, ResponseWithError } from '@/delivery/http/contracts';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';

/**
 * Get IP owner history (alerts grouped by date for a specific IP owner)
 */
type Res = ResponseWithError<IpOwnerHistory[]>;
export async function getIpOwnerHistory(req: Request<GetIpOwnerHistoryParams>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { item } = req.params;
    const history = await container.useCases.statistics.getIpOwnerHistory.execute(item);
    res.json(history as IpOwnerHistory[]);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(errorResponse('Error fetching IP owner history', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
