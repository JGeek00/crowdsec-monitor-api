import { Request, Response } from 'express';
import { BlocklistsTable, ResponseWithError, PostToggleBlocklistParams, PostToggleBlocklistResponse, BlocklistIpsTable } from '@/models';
import { databaseService, statusBlocklistService } from '@/services';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';
import { PROCESS_FIELD_BLOCKLIST, PROCESS_FIELD_BLOCKLIST_OPS } from '@/types/process.types';

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

    if (typeof enabled !== 'boolean') {
      res.status(400).json(errorResponse('Validation error', '"enabled" must be a boolean'));
      return;
    }

    const blocklist = await BlocklistsTable.findByPk(Number(id));
    if (!blocklist) {
      res.status(404).json(errorResponse('Not found', 'BlocklistsTable not found'));
      return;
    }

    if (statusBlocklistService.isBlocklistBusy(blocklist.id)) {
      res.status(409).json(errorResponse('Conflict', 'A process is already running for this blocklist. Wait for it to complete before performing another action.'));
      return;
    }

    if (enabled) {
      await crowdSecAPI.checkBouncerConnection();
      if (!crowdSecAPI.isBouncerConnected()) {
        log.warn('[Blocklists] Cannot enable blocklist: CrowdSec bouncer API key is not valid or CrowdSec LAPI is unreachable. Check the CROWDSEC_BOUNCER_KEY configuration and restart the API.');
        res.status(500).json(errorResponse('CrowdSec connection error', 'Unable to reach CrowdSec LAPI with the configured bouncer key. BlocklistsTable operations are unavailable.'));
        return;
      }
    }

    await blocklist.update({ enabled });

    res.status(200).json({ data: blocklist });

    let processId: string;
    let crowdsecOp: Promise<unknown>;

    if (enabled) {
      processId = statusBlocklistService.createBlocklistEnableProcess(blocklist.id, blocklist.name);
      crowdsecOp = databaseService.refreshBlocklist(blocklist, processId, PROCESS_FIELD_BLOCKLIST.ENABLE);
    } else {
      const totalIps = await BlocklistIpsTable.count({ where: { [BlocklistIpsTable.col.blocklistId]: blocklist.id } });
      processId = statusBlocklistService.createBlocklistDisableProcess(totalIps, blocklist.id, blocklist.name);
      crowdsecOp = databaseService.deleteBlocklistAlerts(blocklist, processId, PROCESS_FIELD_BLOCKLIST_OPS.DISABLE);
    }

    crowdsecOp
      .then(() => statusBlocklistService.completeProcess(processId, true))
      .catch((err) => {
        statusBlocklistService.completeProcess(processId, false, err instanceof Error ? err.message : null);
        log.error(`Background CrowdSec sync failed for blocklist "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`);
      });
  } catch (err) {
    log.error('Error toggling blocklist:', err);
    res.status(500).json(errorResponse('Failed to toggle blocklist', err instanceof Error ? err.message : 'Unknown error'));
  }
}
