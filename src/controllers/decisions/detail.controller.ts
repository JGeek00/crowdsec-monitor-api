import { Request, Response } from 'express';
import { DecisionsTable, AlertsTable, Decision, Alert, UnparsedMetaData, GetDecisionParams, ResponseWithError, GetDecisionResponse } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { parseAlertMeta } from '@/utils/parse-meta-values';

/**
 * Get decision by ID with associated alert
 */
type Res = ResponseWithError<GetDecisionResponse>;
export async function getDecisionById(req: Request<GetDecisionParams, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const decision = await DecisionsTable.findByPk(id, {
      attributes: {
        exclude: [DecisionsTable.col.createdAt, DecisionsTable.col.updatedAt]
      },
      include: [{
        model: AlertsTable,
        as: 'alert',
        attributes: {
          exclude: [AlertsTable.col.createdAt, AlertsTable.col.updatedAt]
        },
      }],
    });

    if (!decision) {
      res.status(404).json(errorResponse('Not found', 'DecisionsTable not found'));
      return;
    }

    const rawDecision = decision.toJSON() as Decision & { alert?: Alert<UnparsedMetaData> };
    const plainDecision: GetDecisionResponse = {
      ...rawDecision,
      alert: rawDecision.alert ? parseAlertMeta(rawDecision.alert) : undefined,
    };

    res.json(plainDecision);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching decision', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
