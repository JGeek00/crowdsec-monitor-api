import { Request, Response } from 'express';
import { Alert, Decision } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { AlertAttributes } from '@/models/Alert';
import { DecisionAttributes } from '@/models/Decision';
import { AlertResponse } from '@/interfaces/alert.interface';
import { parseAlertMeta } from '@/utils/parse-meta-values';

/**
 * Get alert by ID with associated decisions
 */
export async function getAlertById(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const alert = await Alert.findByPk(id, {
      attributes: {
        exclude: [Alert.col.createdAt, Alert.col.updatedAt]
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

    const rawAlert = alert.toJSON() as AlertAttributes & { decisions?: DecisionAttributes[] };
    const plainAlert: AlertResponse = { ...parseAlertMeta(rawAlert), decisions: rawAlert.decisions };

    res.json(plainAlert);
  } catch (error) {
    if (signal.aborted) return;
    res.status(500).json(errorResponse('Error fetching alert', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
