import { Request, Response } from 'express';
import { container } from '@/container';
import { log } from '@/infrastructure/system/logger';
import type { PostToggleBlocklistParams, PostToggleBlocklistResponse, ResponseWithError } from '@/models';
import { sendBlocklistError } from './send-blocklist-error';

/**
 * Enable or disable a blocklist.
 * POST /api/v1/blocklists/:blocklistId/enabled
 * Body: { enabled: boolean }
 *
 * - enabled: true  → update DB, fetch list and push alerts to CrowdSec.
 * - enabled: false → update DB, delete the alerts from CrowdSec and wipe local IPs.
 */
type Res = ResponseWithError<PostToggleBlocklistResponse>;
export async function toggleBlocklist(req: Request<PostToggleBlocklistParams, Res>, res: Response<Res>): Promise<void> {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const blocklist = await container.useCases.blocklists.toggleBlocklist.execute(Number(id), enabled);
    res.status(200).json({ data: blocklist });
  } catch (err) {
    sendBlocklistError(res, err, 'Failed to toggle blocklist', 'Unknown error', log, 'Error toggling blocklist:');
  }
}
