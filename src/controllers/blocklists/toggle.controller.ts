import { Request, Response } from 'express';
import { Blocklist, BlocklistIp } from '@/models';
import { databaseService, statusBlocklistService } from '@/services';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
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
export async function toggleBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { blocklistId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json(errorResponse('Validation error', '"enabled" must be a boolean'));
      return;
    }

    if (enabled && !crowdSecAPI.isBouncerConnected()) {
      console.error('[Blocklist] Cannot enable blocklist: CrowdSec bouncer API key is not valid or CrowdSec LAPI is unreachable. Check the CROWDSEC_BOUNCER_KEY configuration and restart the API.');
      res.status(500).json(errorResponse('CrowdSec connection error', 'Unable to reach CrowdSec LAPI with the configured bouncer key. Blocklist operations are unavailable.'));
      return;
    }

    const blocklist = await Blocklist.findByPk(Number(blocklistId));
    if (!blocklist) {
      res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
      return;
    }

    await blocklist.update({ enabled });

    res.status(200).json({ data: blocklist });

    let processId: string;
    let crowdsecOp: Promise<unknown>;

    if (enabled) {
      processId = statusBlocklistService.createBlocklistEnableProcess();
      crowdsecOp = databaseService.refreshBlocklist(blocklist, processId, PROCESS_FIELD_BLOCKLIST.ENABLE);
    } else {
      const totalIps = await BlocklistIp.count({ where: { [BlocklistIp.col.blocklistId]: blocklist.id } });
      processId = statusBlocklistService.createBlocklistDisableProcess(totalIps);
      crowdsecOp = databaseService.deleteBlocklistAlerts(blocklist, processId, PROCESS_FIELD_BLOCKLIST_OPS.DISABLE);
    }

    crowdsecOp
      .then(() => statusBlocklistService.completeProcess(processId, true))
      .catch((error) => {
        statusBlocklistService.completeProcess(processId, false, error instanceof Error ? error.message : null);
        console.error(`Background CrowdSec sync failed for blocklist "${blocklist.name}": ${error instanceof Error ? error.message : error}`);
      });
  } catch (error) {
    console.error('Error toggling blocklist:', error);
    res.status(500).json(errorResponse('Failed to toggle blocklist', error instanceof Error ? error.message : 'Unknown error'));
  }
}
