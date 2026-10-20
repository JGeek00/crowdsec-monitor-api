import { Request, Response } from 'express';
import { container } from '@/container';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/utils/error-response';
import { NotFoundError } from '@/domain/errors';
import type { DeleteAlertParams, DeleteAlertResponse, ResponseWithError } from '@/delivery/http/contracts';

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

    const { nbDeleted } = await container.useCases.alerts.deleteAlert.execute(id);

    res.json({
      message: 'Alert deleted successfully',
      nbDeleted: nbDeleted.toString(),
    });
  } catch (err: unknown) {
    const typedErr = err as { message?: string; response?: { status?: number } };
    log.error('Error deleting alert:', typedErr.message);

    if (err instanceof NotFoundError || typedErr.response?.status === 404) {
      res.status(404).json(errorResponse('Alert not found', `Alert with ID ${req.params.id} was not found`));
      return;
    }

    res
      .status(typedErr.response?.status || 500)
      .json(errorResponse('Failed to delete alert', typedErr.message ?? 'Unknown error'));
  }
};
