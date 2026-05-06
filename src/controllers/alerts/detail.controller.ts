import { Request, Response } from 'express';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { DecisionAttributes } from '@/models/db/Decision';
import { parseAlertMeta } from '@/utils/parse-meta-values';
import { Alert, AlertDb, Decision, GetAlertResponse, UnparsedMetaData } from '@/models';
import { GetAlertParams } from '@/models/in/GetAlertParams.model';

/**
 * Get alert by ID with associated decisions
 */
export async function getAlertById(req: Request<GetAlertParams, GetAlertResponse>, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const alert = await AlertDb.findByPk(id, {
      attributes: {
        exclude: [AlertDb.col.createdAt, AlertDb.col.updatedAt]
      },
      include: [{
        model: Decision,
        as: 'decisions',
        attributes: {
          exclude: [Decision.col.createdAt, Decision.col.updatedAt]
        },
      }],
    });

    if (!alert) {
      res.status(404).json(errorResponse('Not found', 'Alert not found'));
      return;
    }

    const rawAlert = alert.toJSON() as Alert<UnparsedMetaData> & { decisions?: DecisionAttributes[] };
    const plainAlert: GetAlertResponse = { ...parseAlertMeta(rawAlert), decisions: rawAlert.decisions };

    res.json(plainAlert);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching alert', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
