import { Request, Response } from 'express';
import { Blocklist } from '../../models';
import { databaseService } from '../../services';
import { errorResponse } from '../../utils/error-response';

/**
 * Delete a blocklist by ID.
 * Removes the CrowdSec alerts first, then deletes the DB entry
 * (IPs are removed via CASCADE on delete).
 */
export async function deleteBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const blocklist = await Blocklist.findByPk(Number(id));
    if (!blocklist) {
      res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
      return;
    }

    await blocklist.destroy();

    res.status(202).json({ message: 'Blocklist deletion requested' });

    databaseService.deleteBlocklistAlerts(blocklist)
      .catch((error) => console.error(`Error deleting blocklist alerts "${blocklist.name}":`, error));
  } catch (error) {
    console.error('Error deleting blocklist:', error);
    res.status(500).json(errorResponse('Failed to delete blocklist', error instanceof Error ? error.message : 'Unknown error'));
  }
}
