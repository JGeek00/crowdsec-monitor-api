import { Request, Response } from 'express';
import { crowdSecAPI, databaseService } from '../../services';
import { Decision } from '../../models';

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
      res.status(400).json({
        error: 'Invalid decision ID',
        message: 'Decision ID must be a valid number'
      });
      return;
    }

    const nbDeleted = await crowdSecAPI.deleteDecision(id);

    if (nbDeleted === 0) {
      res.status(404).json({
        error: 'Decision not found',
        message: `Decision with ID ${id} was not found`
      });
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
  } catch (error: any) {
    console.error('Error deleting decision:', error.message);
    
    if (error.response?.status === 404) {
      res.status(404).json({
        error: 'Decision not found',
        message: `Decision with ID ${req.params.id} was not found`
      });
      return;
    }

    res.status(error.response?.status || 500).json({
      error: 'Failed to delete decision',
      message: error.message
    });
  }
};
