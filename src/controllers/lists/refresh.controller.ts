import { Request, Response } from 'express';
import { ResponseWithError } from '@/models';
import { databaseService, statusBlocklistService } from '@/services';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';

/**
 * Trigger a manual blocklist & allowlist refresh.
 * POST /api/v1/lists/refresh
 *
 * Checks that no other blocklist process is running, then launches refreshBlocklists
 * in the background. Returns immediately without waiting for completion.
 */
type Res = ResponseWithError<{ message: string }>;
export async function refreshLists(_req: Request<object, Res>, res: Response<Res>): Promise<void> {
  try {
    if (statusBlocklistService.isAnyBlocklistProcessRunning()) {
      res
        .status(503)
        .json(
          errorResponse('Service Unavailable', 'A blocklist operation is already in progress. Please try again later.'),
        );
      return;
    }

    databaseService.refreshBlocklists().catch((err) => {
      log.error('Background blocklist refresh failed:', err);
    });

    res.status(202).json({ message: 'Blocklist refresh started' });
  } catch (err) {
    log.error('Error starting blocklist refresh:', err);
    res
      .status(500)
      .json(errorResponse('Failed to start blocklist refresh', err instanceof Error ? err.message : 'Unknown error'));
  }
}
