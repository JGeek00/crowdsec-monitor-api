import { Request, Response } from 'express';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/application/container';
import { NotFoundError } from '@/domain/errors';
import type { GetAlertParams, GetAlertResponse, ResponseWithError } from '@/models';

/**
 * Get alert by ID with associated decisions
 */
type Res = ResponseWithError<GetAlertResponse>;
export async function getAlertById(req: Request<GetAlertParams, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await container.useCases.alerts.getAlert.execute(parseInt(id, 10));

    res.json({ ...result.alert, decisions: result.decisions } as GetAlertResponse);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Alert not found'));
      return;
    }
    res
      .status(500)
      .json(errorResponse('Error fetching alert', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
