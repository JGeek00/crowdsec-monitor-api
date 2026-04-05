import { Request, Response } from 'express';
import { Blocklist } from '@/models';
import { databaseService } from '@/services';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { errorResponse } from '@/utils/error-response';

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

    const crowdsecOp = enabled
      ? databaseService.refreshBlocklist(blocklist)
      : databaseService.deleteBlocklistAlerts(blocklist);

    crowdsecOp.catch((error) => {
      console.error(`Background CrowdSec sync failed for blocklist "${blocklist.name}": ${error instanceof Error ? error.message : error}`);
    });
  } catch (error) {
    console.error('Error toggling blocklist:', error);
    res.status(500).json(errorResponse('Failed to toggle blocklist', error instanceof Error ? error.message : 'Unknown error'));
  }
}
