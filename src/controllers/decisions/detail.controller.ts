import { Request, Response } from 'express';
import { Decision, Alert } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { AlertAttributes } from '@/models/Alert';
import { DecisionAttributes } from '@/models/Decision';
import { DecisionResponse } from '@/interfaces/decision.interface';
import { parseAlertMeta } from '@/utils/parse-meta-values';

/**
 * Get decision by ID with associated alert
 */
export async function getDecisionById(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const decision = await Decision.findByPk(id, {
      attributes: {
        exclude: [Decision.col.createdAt, Decision.col.updatedAt]
      },
      include: [{
        model: Alert,
        as: 'alert',
        attributes: {
          exclude: [Alert.col.createdAt, Alert.col.updatedAt]
        },
      }],
    });

    if (!decision) {
      res.status(404).json(errorResponse('Not found', 'Decision not found'));
      return;
    }

    const rawDecision = decision.toJSON() as DecisionAttributes & { alert?: AlertAttributes };
    const plainDecision: DecisionResponse = {
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
