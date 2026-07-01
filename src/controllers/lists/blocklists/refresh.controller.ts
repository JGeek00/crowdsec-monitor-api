import { Request, Response } from 'express';
import { BlocklistsTable, DeleteBlocklistParams, ResponseWithError } from '@/models';
import { databaseService, statusBlocklistService } from '@/services';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';
import { PROCESS_FIELD_BLOCKLIST } from '@/types/process.types';

/**
 * Refresh a single blocklist.
 * POST /api/v1/lists/blocklists/:id/refresh
 *
 * Checks that no global refresh or per-blocklist process is running,
 * then launches refreshBlocklist in the background. Returns immediately.
 */
type Res = ResponseWithError<{ message: string }>;
export async function refreshSingleBlocklist(
  req: Request<DeleteBlocklistParams, Res>,
  res: Response<Res>,
): Promise<void> {
  try {
    if (statusBlocklistService.isSyncingBlocklists()) {
      res
        .status(503)
        .json(errorResponse('Service Unavailable', 'Blocklist refresh is in progress. Please try again later.'));
      return;
    }

    const { id } = req.params;

    const blocklist = await BlocklistsTable.findByPk(Number(id));
    if (!blocklist) {
      res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
      return;
    }

    if (statusBlocklistService.isBlocklistBusy(blocklist.id)) {
      res
        .status(409)
        .json(
          errorResponse(
            'Conflict',
            'A process is already running for this blocklist. Wait for it to complete before performing another action.',
          ),
        );
      return;
    }

    const processId = statusBlocklistService.createBlocklistSingleRefreshProcess(blocklist.id, blocklist.name);

    res.status(202).json({ message: 'Blocklist refresh started' });

    databaseService
      .refreshBlocklist(blocklist, processId, PROCESS_FIELD_BLOCKLIST.SINGLE_REFRESH)
      .then(() => statusBlocklistService.completeProcess(processId, true))
      .catch((err) => {
        statusBlocklistService.completeProcess(processId, false, err instanceof Error ? err.message : null);
        log.error(`Error refreshing blocklist "${blocklist.name}": ${err instanceof Error ? err.message : err}`);
      });
  } catch (err) {
    log.error('Error starting blocklist refresh:', err);
    res
      .status(500)
      .json(errorResponse('Failed to start blocklist refresh', err instanceof Error ? err.message : 'Unknown error'));
  }
}
