import { Request, Response } from 'express';
import {
  DecisionsTable,
  AlertsTable,
  Decision,
  DecisionGroup,
  Alert,
  UnparsedMetaData,
  GetDecisionsByIpQueryParams,
  GetDecisionsByIpResponse,
  ResponseWithError,
} from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { parseAlertMeta } from '@/utils/parse-meta-values';
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
 * Get decisions grouped by IP, with filtering and pagination.
 * Default: returns groups with counts only.
 * ?include_decisions=true: returns groups with full decision objects including alert detail.
 */
type Res = ResponseWithError<GetDecisionsByIpResponse>;
export async function listDecisionsByIp(
  req: Request<object, Res, object, GetDecisionsByIpQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { limit = 100, offset = 0, unpaged = false, only_active } = req.query;
    const withDecisions = String(req.query.include_decisions) === 'true';

    const where = buildDecisionsWhere(req.query, true);

    const [filtering, rows] = await Promise.all([
      fetchFilteringOptions(),
      withDecisions
        ? DecisionsTable.findAll({
            where,
            ...DECISIONS_QUERY,
            include: [
              {
                model: AlertsTable,
                as: 'alert',
                attributes: { exclude: [AlertsTable.col.createdAt, AlertsTable.col.updatedAt] },
              },
            ],
          })
        : DecisionsTable.findAll({ where, ...DECISIONS_QUERY }),
    ]);

    const plainRows = rows.map((r) => r.toJSON() as Decision);
    const filtered = applyJsFilters(plainRows, req.query.country, req.query.ip_owner);

    let groups = groupDecisionsByIp(filtered, only_active, withDecisions);
    if (only_active) groups = groups.filter((g) => g.active_decisions > 0);

    // When including decision details, parse alert meta like the single-IP endpoint
    if (withDecisions) {
      groups = groups.map((group) => ({
        ...group,
        decisions: ((group.decisions ?? []) as (Decision & { alert?: Alert<UnparsedMetaData> })[]).map((decision) => {
          const { source: _ds, alert: rawAlert, ...rest } = decision;
          if (!rawAlert) return { ...rest, alert: undefined };
          const { source: _as, ...alertRest } = parseAlertMeta(rawAlert);
          return { ...rest, alert: alertRest };
        }),
      })) as unknown as DecisionGroup[];
    }

    const { items, pagination, total } = buildPaginatedResponse(
      groups,
      +(limit as number),
      +(offset as number),
      unpaged!,
    );

    res.json({ filtering, groups: items, pagination, total } as GetDecisionsByIpResponse);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof PaginationError) {
      res.status(400).json(errorResponse('Validation error', error.message));
      return;
    }
    res
      .status(500)
      .json(errorResponse('Error fetching decisions by IP', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
