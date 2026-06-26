import { Request, Response } from 'express';
import { crowdSecAPI, databaseService } from '@/services';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';
import { DeleteAlertParams, DeleteAlertResponse, AlertsTable, ResponseWithError } from '@/models';

/**
 * Delete an alert by ID from CrowdSec LAPI
 * DELETE /api/v1/alerts/:id
 */
type Res = ResponseWithError<DeleteAlertResponse>;
export const deleteAlert = async (req: Request<DeleteAlertParams, Res>, res: Response<Res>): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      res.status(400).json(errorResponse('Invalid alert ID', 'Alert ID must be a valid number'));
      return;
    }

    const nbDeleted = await crowdSecAPI.alerts.deleteAlert(id);

    if (nbDeleted === 0) {
      res.status(404).json(errorResponse('Alert not found', `Alert with ID ${id} was not found`));
      return;
    }

    // Delete from local database immediately after successful deletion from LAPI
    await AlertsTable.destroy({ where: { id } });

    // Sync alerts from LAPI after successful deletion
    await databaseService.syncAlerts();

    res.json({
      message: 'Alert deleted successfully',
      nbDeleted: nbDeleted.toString(),
    });
  } catch (err: unknown) {
    const typedErr = err as { message?: string; response?: { status?: number } };
    log.error('Error deleting alert:', typedErr.message);

    if (typedErr.response?.status === 404) {
      res.status(404).json(errorResponse('Alert not found', `Alert with ID ${req.params.id} was not found`));
      return;
    }

    res
      .status(typedErr.response?.status || 500)
      .json(errorResponse('Failed to delete alert', typedErr.message ?? 'Unknown error'));
  }
};
