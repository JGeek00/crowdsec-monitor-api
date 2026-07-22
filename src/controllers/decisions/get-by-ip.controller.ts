import { Request, Response } from 'express';
import {
  DecisionsTable,
  AlertsTable,
  Decision,
  Alert,
  UnparsedMetaData,
  GetDecisionByIpParams,
  GetDecisionByIpResponse,
  DecisionSummary,
  ResponseWithError,
} from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { parseAlertMeta } from '@/utils/parse-meta-values';
import { groupDecisionsByIp, DECISIONS_QUERY } from '@/helpers/decisions/list.helpers';

type Res = ResponseWithError<GetDecisionByIpResponse>;
export async function getDecisionByIp(req: Request<GetDecisionByIpParams, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const ip = Array.isArray(req.params.ip) ? req.params.ip[0] : req.params.ip;

    const rows = await DecisionsTable.findAll({
      where: { value: ip },
      ...DECISIONS_QUERY,
      include: [
        {
          model: AlertsTable,
          as: 'alert',
          attributes: { exclude: [AlertsTable.col.createdAt, AlertsTable.col.updatedAt] },
        },
      ],
    });
    const plainRows = rows.map((r) => r.toJSON() as Decision & { alert?: Alert<UnparsedMetaData> });

    const groups = groupDecisionsByIp(plainRows, undefined, true);
    const group = groups[0];
    if (!group) {
      res.status(404).json(errorResponse('Not found', `No decisions for IP ${ip}`));
      return;
    }

    const response: GetDecisionByIpResponse = {
      ...group,
      decisions: ((group.decisions ?? []) as (Decision & { alert?: Alert<UnparsedMetaData> })[]).map((decision) => {
        const { source: _ds, alert: rawAlert, ...rest } = decision;
        if (!rawAlert) return { ...rest, alert: undefined } as DecisionSummary;
        const { source: _as, ...alertRest } = parseAlertMeta(rawAlert);
        return { ...rest, alert: alertRest } as DecisionSummary;
      }),
    };

    res.json(response);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(errorResponse('Error fetching decision by IP', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
