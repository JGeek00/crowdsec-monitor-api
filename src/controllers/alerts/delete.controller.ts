import { Request, Response } from 'express';
import { crowdSecAPI, databaseService } from '../../services';
import { Alert } from '../../models';

/**
 * Delete an alert by ID from CrowdSec LAPI
 * DELETE /api/v1/alerts/:id
 */
export const deleteAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      res.status(400).json({
        error: 'Invalid alert ID',
        message: 'Alert ID must be a valid number'
      });
      return;
    }

    const nbDeleted = await crowdSecAPI.deleteAlert(id);

    if (nbDeleted === 0) {
      res.status(404).json({
        error: 'Alert not found',
        message: `Alert with ID ${id} was not found`
      });
      return;
    }

    // Delete from local database immediately after successful deletion from LAPI
    await Alert.destroy({ where: { id } });

    // Sync alerts from LAPI after successful deletion
    await databaseService.syncAlerts();

    res.json({
      message: 'Alert deleted successfully',
      nbDeleted: nbDeleted.toString()
    });
  } catch (error: any) {
    console.error('Error deleting alert:', error.message);
    
    if (error.response?.status === 404) {
      res.status(404).json({
        error: 'Alert not found',
        message: `Alert with ID ${req.params.id} was not found`
      });
      return;
    }

    res.status(error.response?.status || 500).json({
      error: 'Failed to delete alert',
      message: error.message
    });
  }
};
