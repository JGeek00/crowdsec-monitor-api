import { Request, Response } from 'express';
import type { GetNotificationHistoryAlertsResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { parseAlertMeta } from '@/shared/utils/parse-meta-values';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';

type Res = ResponseWithError<GetNotificationHistoryAlertsResponse>;

/** Alerts that fired a sent notification, with full detail. */
export async function getNotificationHistoryAlerts(req: Request<{ id: string }>, res: Response<Res>): Promise<void> {
  try {
    const alerts = await container.useCases.notifications.getHistoryAlerts.execute(req.params.id);
    if (alerts === null) {
      res.status(404).json(errorResponse('Not found', 'History entry not found'));
      return;
    }
    // Some JSON columns come back as strings; parse meta the same way as /alerts.
    res.status(200).json({ data: alerts.map((a) => parseAlertMeta(a as never)) });
  } catch (err) {
    log.error('Error getting history entry alerts:', err);
    res
      .status(500)
      .json(errorResponse('Failed to get history alerts', err instanceof Error ? err.message : 'Unknown error'));
  }
}
