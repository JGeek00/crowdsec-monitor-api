import { Request, Response } from 'express';
import { DecisionsTable, GetDecisionsQueryParams, GetDecisionsResponse, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import {
  buildDecisionsWhere,
  buildPaginatedResponse,
  PaginationError,
  DECISIONS_QUERY,
} from '@/helpers/decisions/list.helpers';

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
    const { limit = 100, offset = 0, unpaged = false } = req.query;

    const where = buildDecisionsWhere(req.query, false);

    const decisions = await DecisionsTable.findAll({ where, ...DECISIONS_QUERY });

    const { items, pagination, total } = buildPaginatedResponse(
      decisions,
      +(limit as number),
      +(offset as number),
      unpaged!,
    );

    res.json({ items, pagination, total } as GetDecisionsResponse);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof PaginationError) {
      res.status(400).json(errorResponse('Validation error', error.message));
      return;
    }
    res
      .status(500)
      .json(errorResponse('Error fetching decisions', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
