import { Request, Response } from 'express';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';
import { NotFoundError } from '@/domain/errors';
import type { GetDecisionParams, GetDecisionResponse, ResponseWithError } from '@/models';

/**
 * Get decision by ID with associated alert
 */
type Res = ResponseWithError<GetDecisionResponse>;
export async function getDecisionById(req: Request<GetDecisionParams, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await container.useCases.decisions.getDecision.execute(parseInt(id, 10));
    res.json(result as GetDecisionResponse);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'DecisionsTable not found'));
      return;
    }
    res
      .status(500)
      .json(errorResponse('Error fetching decision', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
