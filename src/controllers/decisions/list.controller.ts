import { Request, Response } from 'express';
import { DecisionsTable, GetDecisionsQueryParams, GetDecisionsResponse, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import {
  buildDecisionsWhere,
  fetchFilteringOptions,
  applyJsFilters,
  groupDecisionsByIp,
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
    const { limit = 100, offset = 0, unpaged = false, country, ip_owner, only_active, group } = req.query;

    const where = buildDecisionsWhere(req.query, !!group);

    const [filtering, decisions] = await Promise.all([
      fetchFilteringOptions(),
      DecisionsTable.findAll({ where, ...DECISIONS_QUERY }),
    ]);

    const filtered = applyJsFilters(decisions, country, ip_owner);

    const response: GetDecisionsResponse = { filtering };

    if (group) {
      let groups = groupDecisionsByIp(filtered, only_active, group === 'ip_with_decisions');
      if (only_active) groups = groups.filter((g) => g.active_decisions > 0);

      const { items, pagination, total } = buildPaginatedResponse(
        groups,
        +(limit as number),
        +(offset as number),
        unpaged!,
      );
      response.groups = items;
      if (pagination) response.pagination = pagination;
      if (total !== undefined) response.total = total;
    } else {
      const { items, pagination, total } = buildPaginatedResponse(
        filtered,
        +(limit as number),
        +(offset as number),
        unpaged!,
      );
      response.items = items;
      if (pagination) response.pagination = pagination;
      if (total !== undefined) response.total = total;
    }

    res.json(response);
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
