import { Request, Response } from 'express';
import { container } from '@/application/container';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/utils/error-response';
import { NotFoundError } from '@/domain/errors';
import type { DeleteDecisionParams, DeleteDecisionResponse, ResponseWithError } from '@/models';

/**
 * Delete a decision by ID from CrowdSec LAPI
 * Sets the expiration date to current time in local database
 * DELETE /api/v1/decisions/:id
 */
type Res = ResponseWithError<DeleteDecisionResponse>;
export const deleteDecision = async (
  req: Request<DeleteDecisionParams, Res, object>,
  res: Response<Res>,
): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      res.status(400).json(errorResponse('Invalid decision ID', 'DecisionsTable ID must be a valid number'));
      return;
    }

    const { nbDeleted } = await container.useCases.decisions.deleteDecision.execute(id);

    res.json({
      message: 'DecisionsTable deleted successfully',
      nbDeleted: nbDeleted.toString(),
    });
  } catch (err: unknown) {
    const typedErr = err as { message?: string; response?: { status?: number } };
    log.error('Error deleting decision:', typedErr.message);

    if (err instanceof NotFoundError || typedErr.response?.status === 404) {
      res
        .status(404)
        .json(errorResponse('DecisionsTable not found', `DecisionsTable with ID ${req.params.id} was not found`));
      return;
    }

    res
      .status(typedErr.response?.status || 500)
      .json(errorResponse('Failed to delete decision', typedErr.message ?? 'Unknown error'));
  }
};
