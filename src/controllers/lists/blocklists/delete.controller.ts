import { Request, Response } from 'express';
import { BlocklistIpsTable, BlocklistsTable, DeleteBlocklistParams, DeleteBlocklistResponse, ResponseWithError } from '@/models';
import { databaseService, statusBlocklistService } from '@/services';
import { errorResponse } from '@/utils/error-response';
import { PROCESS_FIELD_BLOCKLIST_OPS } from '@/types/process.types';

/**
 * Delete a blocklist by ID.
 * Removes the CrowdSec alerts first, then deletes the DB entry
 * (IPs are removed via CASCADE on delete).
 */
type Res = ResponseWithError<DeleteBlocklistResponse>;
export async function deleteBlocklist(req: Request<DeleteBlocklistParams, Res>, res: Response<Res>): Promise<void> {
  try {
    const { id } = req.params;

    const blocklist = await BlocklistsTable.findByPk(Number(id));
    if (!blocklist) {
      res.status(404).json(errorResponse('Not found', 'BlocklistsTable not found'));
      return;
    }

    if (statusBlocklistService.isBlocklistBusy(blocklist.id)) {
      res.status(409).json(errorResponse('Conflict', 'A process is already running for this blocklist. Wait for it to complete before performing another action.'));
      return;
    }

    const totalIps = await BlocklistIpsTable.count({ where: { [BlocklistIpsTable.col.blocklistId]: blocklist.id } });
    const processId = statusBlocklistService.createBlocklistDeleteProcess(totalIps, blocklist.id, blocklist.name);

    await blocklist.destroy();

    res.status(202).json({ message: 'BlocklistsTable deletion requested' });

    databaseService.deleteBlocklistAlerts(blocklist, processId, PROCESS_FIELD_BLOCKLIST_OPS.DELETE)
      .then(() => statusBlocklistService.completeProcess(processId, true))
      .catch((error) => {
        statusBlocklistService.completeProcess(processId, false, error instanceof Error ? error.message : null);
        console.error(`Error deleting blocklist alerts "${blocklist.name}":`, error);
      });
  } catch (error) {
    console.error('Error deleting blocklist:', error);
    res.status(500).json(errorResponse('Failed to delete blocklist', error instanceof Error ? error.message : 'Unknown error'));
  }
}
