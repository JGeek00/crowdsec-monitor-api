import { Request, Response } from 'express';
import type { GetAllowlistParams, GetAllowlistResponse, ResponseWithError } from '@/models';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/application/container';
import { NotFoundError } from '@/domain/errors';

/**
 * Get a specific allowlist by name from CrowdSec LAPI
 */
type Res = ResponseWithError<GetAllowlistResponse>;
export async function getAllowlistByName(req: Request<GetAllowlistParams, Res>, res: Response<Res>): Promise<void> {
  try {
    const allowlist_name = req.params.allowlist_name;

    const sanitizedAllowlist = await container.useCases.blocklists.getAllowlist.execute(allowlist_name);

    res.status(200).json({ data: sanitizedAllowlist });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res
        .status(404)
        .json(errorResponse('Allowlist not found', `Allowlist '${req.params.allowlist_name}' was not found`));
      return;
    }
    log.error('Error fetching allowlist:', err);
    res
      .status(500)
      .json(errorResponse('Failed to fetch allowlist', err instanceof Error ? err.message : 'Unknown error'));
  }
}
