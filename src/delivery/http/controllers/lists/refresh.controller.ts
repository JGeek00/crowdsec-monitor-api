import { Request, Response } from 'express';
import { ResponseWithError } from '@/delivery/http/contracts';
import { container } from '@/container';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/delivery/http/error-response';
import { ServiceUnavailableError } from '@/domain/errors';

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
    await container.useCases.blocklists.refreshAllBlocklists.execute();

    res.status(202).json({ message: 'Blocklist refresh started' });
  } catch (err) {
    if (err instanceof ServiceUnavailableError) {
      res.status(503).json(errorResponse(err.kind, err.detail));
      return;
    }
    log.error('Error starting blocklist refresh:', err);
    res
      .status(500)
      .json(errorResponse('Failed to start blocklist refresh', err instanceof Error ? err.message : 'Unknown error'));
  }
}
