import { Request, Response } from 'express';
import { container } from '@/application/container';
import { log } from '@/services/log.service';
import type { DeleteBlocklistParams, ResponseWithError } from '@/models';
import { sendBlocklistError } from './send-blocklist-error';

/**
 * Accepts a blocklist ID, validates guards, and kicks off an async full refresh via `refreshBlocklists`.
 */
type Res = ResponseWithError<{ message: string }>;
export async function refreshSingleBlocklist(
  req: Request<DeleteBlocklistParams, Res>,
  res: Response<Res>,
): Promise<void> {
  try {
    const { id } = req.params;

    await container.useCases.blocklists.refreshSingleBlocklist.execute(Number(id));

    res.status(202).json({ message: 'Blocklist refresh started' });
  } catch (err) {
    sendBlocklistError(
      res,
      err,
      'Failed to start blocklist refresh',
      'Unknown error',
      log,
      'Error starting blocklist refresh:',
    );
  }
}
