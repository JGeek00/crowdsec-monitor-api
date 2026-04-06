import { Request, Response } from 'express';
import { crowdSecAPI, databaseService } from '@/services';
import { errorResponse } from '@/utils/error-response';
import { Decision } from '@/models';

/**
 * Delete a decision by ID from CrowdSec LAPI
 * Sets the expiration date to current time in local database
 * DELETE /api/v1/decisions/:id
 */
export const deleteDecision = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      res.status(400).json(errorResponse('Invalid decision ID', 'Decision ID must be a valid number'));
      return;
    }

    const nbDeleted = await crowdSecAPI.deleteDecision(id);

    if (nbDeleted === 0) {
      res.status(404).json(errorResponse('Decision not found', `Decision with ID ${id} was not found`));
      return;
    }

    // Set expiration to current time in local database instead of deleting
    await Decision.update(
      { expiration: new Date(), updated_at: new Date() },
      { where: { id } }
    );

    // Sync alerts from LAPI after successful deletion
    await databaseService.syncAlerts();

    res.json({
      message: 'Decision deleted successfully',
      nbDeleted: nbDeleted.toString()
    });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    console.error('Error deleting decision:', err.message);
    
    if (err.response?.status === 404) {
      res.status(404).json(errorResponse('Decision not found', `Decision with ID ${req.params.id} was not found`));
      return;
    }

    res.status(err.response?.status || 500).json(errorResponse('Failed to delete decision', err.message ?? 'Unknown error'));
  }
};
