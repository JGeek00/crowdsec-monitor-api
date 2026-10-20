import { Request, Response } from 'express';
import { container } from '@/container';
import { log } from '@/infrastructure/system/logger';
import type { DeleteBlocklistParams, DeleteBlocklistResponse, ResponseWithError } from '@/models';
import { sendBlocklistError } from './send-blocklist-error';

/**
 * Delete a blocklist by ID.
 * Removes the CrowdSec alerts first, then deletes the DB entry
 * (IPs are removed via CASCADE on delete).
 */
type Res = ResponseWithError<DeleteBlocklistResponse>;
export async function deleteBlocklist(req: Request<DeleteBlocklistParams, Res>, res: Response<Res>): Promise<void> {
  try {
    const { id } = req.params;

    await container.useCases.blocklists.deleteBlocklist.execute(Number(id));

    res.status(202).json({ message: 'BlocklistsTable deletion requested' });
  } catch (err) {
    sendBlocklistError(res, err, 'Failed to delete blocklist', 'Unknown error', log, 'Error deleting blocklist:');
  }
}
