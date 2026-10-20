import { Op } from '@sequelize/core';
import { Request, Response } from 'express';
import {
  Alert,
  AlertsTable,
  GetNotificationHistoryAlertsResponse,
  ResponseWithError,
  UnparsedMetaData,
} from '@/delivery/http/contracts';
import { notificationHistoryService } from '@/infrastructure/notifications/history';
import { parseAlertMeta } from '@/shared/utils/parse-meta-values';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';

type Res = ResponseWithError<GetNotificationHistoryAlertsResponse>;

/** Alerts that fired a sent notification, with full detail. */
export async function getNotificationHistoryAlerts(req: Request<{ id: string }>, res: Response<Res>): Promise<void> {
  try {
    const entry = notificationHistoryService.find(req.params.id);
    if (!entry) {
      res.status(404).json(errorResponse('Not found', 'History entry not found'));
      return;
    }
    if (entry.alertIds.length === 0) {
      res.status(200).json({ data: [] });
      return;
    }
    const rows = await AlertsTable.findAll({ where: { id: { [Op.in]: entry.alertIds } } });
    // Some JSON columns come back as strings; parse meta the same way as /alerts.
    const data = rows.map((row) => parseAlertMeta(row.toJSON() as Alert<UnparsedMetaData>));
    res.status(200).json({ data });
  } catch (err) {
    log.error('Error getting history entry alerts:', err);
    res
      .status(500)
      .json(errorResponse('Failed to get history alerts', err instanceof Error ? err.message : 'Unknown error'));
  }
}
