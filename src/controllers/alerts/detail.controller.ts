import { Request, Response } from 'express';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { Decision, GetAlertParams, ResponseWithError } from '@/models';
import { parseAlertMeta } from '@/utils/parse-meta-values';
import { Alert, AlertsTable, DecisionsTable, GetAlertResponse, UnparsedMetaData } from '@/models';

/**
 * Get alert by ID with associated decisions
 */
type Res = ResponseWithError<GetAlertResponse>;
export async function getAlertById(req: Request<GetAlertParams, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const alert = await AlertsTable.findByPk(id, {
      attributes: {
        exclude: [AlertsTable.col.createdAt, AlertsTable.col.updatedAt]
      },
      include: [{
        model: DecisionsTable,
        as: 'decisions',
        attributes: {
          exclude: [DecisionsTable.col.createdAt, DecisionsTable.col.updatedAt]
        },
      }],
    });

    if (!alert) {
      res.status(404).json(errorResponse('Not found', 'Alert not found'));
      return;
    }

    const rawAlert = alert.toJSON() as Alert<UnparsedMetaData> & { decisions?: Decision[] };
    const plainAlert: GetAlertResponse = { ...parseAlertMeta(rawAlert), decisions: rawAlert.decisions };

    res.json(plainAlert);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching alert', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
