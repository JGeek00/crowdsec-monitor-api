import { Request, Response } from 'express';
import { BlocklistsTable, DeleteBlocklistParams, ResponseWithError } from '@/models';
import { databaseService, statusBlocklistService } from '@/services';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';

/**
 * Accepts a blocklist ID, validates guards, and kicks off an async full refresh via `syncBlocklists`.
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

    res.status(202).json({ message: 'Blocklist refresh started' });

    databaseService.syncBlocklists(blocklist).catch((err) => {
      log.error(`Error refreshing blocklist "${blocklist.name}": ${err instanceof Error ? err.message : err}`);
    });
  } catch (err) {
    log.error('Error starting blocklist refresh:', err);
    res
      .status(500)
      .json(errorResponse('Failed to start blocklist refresh', err instanceof Error ? err.message : 'Unknown error'));
  }
}
