import { Request, Response } from 'express';
import { BlocklistsTable, PostBlocklistBody, PostBlocklistResponse, ResponseWithError } from '@/models';
import { databaseService, statusBlocklistService } from '@/services';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';
import { assertSafeUrl } from '@/utils/url';
import { PROCESS_FIELD_BLOCKLIST } from '@/types/process.types';

/**
 * Add a new blocklist URL.
 * Body: { url: string, name: string }
 */
type Res = ResponseWithError<PostBlocklistResponse>;
export async function createBlocklist(req: Request<object, Res, PostBlocklistBody>, res: Response<Res>): Promise<void> {
  try {
    if (statusBlocklistService.isSyncingBlocklists()) {
      res
        .status(503)
        .json(errorResponse('Service Unavailable', 'Blocklist refresh is in progress. Please try again later.'));
      return;
    }

    await crowdSecAPI.checkBouncerConnection();
    if (!crowdSecAPI.isBouncerConnected()) {
      log.warn(
        '[Blocklist] Cannot create blocklist: CrowdSec bouncer API key is not valid or CrowdSec LAPI is unreachable. Check the CROWDSEC_BOUNCER_KEY configuration and restart the API.',
      );
      res
        .status(500)
        .json(
          errorResponse(
            'CrowdSec connection error',
            'Unable to reach CrowdSec LAPI with the configured bouncer key. Blocklist operations are unavailable.',
          ),
        );
      return;
    }

    const { url, name } = req.body;

    if (!url || typeof url !== 'string' || url.trim() === '') {
      res.status(400).json(errorResponse('Validation error', 'url is required'));
      return;
    }
    try {
      assertSafeUrl(url.trim());
    } catch (err) {
      res.status(400).json(errorResponse('Validation error', err instanceof Error ? err.message : 'Invalid URL'));
      return;
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json(errorResponse('Validation error', 'name is required'));
      return;
    }

    const existing = await BlocklistsTable.findOne({ where: { url: url.trim() } });
    if (existing) {
      res.status(409).json(errorResponse('Conflict', 'A blocklist with this URL already exists'));
      return;
    }

    const blocklist = await BlocklistsTable.create({
      url: url.trim(),
      name: name.trim(),
      enabled: true,
      added_date: new Date(),
      last_refresh_attempt: null,
      last_successful_refresh: null,
    });

    res.status(201).json({ data: blocklist });

    // Trigger immediate fetch & CrowdSec push in the background
    const processId = statusBlocklistService.createBlocklistImportProcess(blocklist.id, blocklist.name);
    databaseService
      .activateBlocklist(blocklist, processId, PROCESS_FIELD_BLOCKLIST.IMPORT)
      .then(() => statusBlocklistService.completeProcess(processId, true))
      .catch((err) => {
        statusBlocklistService.completeProcess(processId, false, err instanceof Error ? err.message : null);
        log.error(
          `Error during initial activation of blocklist "${blocklist.name}": ${err instanceof Error ? err.message : err}`,
        );
      });
  } catch (err) {
    log.error('Error creating blocklist:', err);
    res
      .status(500)
      .json(errorResponse('Failed to create blocklist', err instanceof Error ? err.message : 'Unknown error'));
  }
}
