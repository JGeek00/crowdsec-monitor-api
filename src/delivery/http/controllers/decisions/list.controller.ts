import { Request, Response } from 'express';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';
import { PaginationError } from '@/application/use-cases/decisions/list.helpers';
import { ValidationError } from '@/domain/errors';
import type { GetDecisionsQueryParams, GetDecisionsResponse, ResponseWithError } from '@/delivery/http/contracts';

/**
 * Get all decisions with filtering and pagination
 */
type Res = ResponseWithError<GetDecisionsResponse>;
export async function getAllDecisions(
  req: Request<object, Res, object, GetDecisionsQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const result = await container.useCases.decisions.listDecisions.execute(req.query);
    res.json(result as GetDecisionsResponse);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof PaginationError) {
      res.status(400).json(errorResponse('Validation error', error.message));
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json(errorResponse('Validation error', error.detail));
      return;
    }
    res
      .status(500)
      .json(errorResponse('Error fetching decisions', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
