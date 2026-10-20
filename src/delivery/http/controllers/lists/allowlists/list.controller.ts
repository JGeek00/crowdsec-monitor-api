import { Request, Response } from 'express';
import type { GetAllowlistsResponse, ResponseWithError } from '@/models';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/application/container';

/**
 * Get all allowlists from CrowdSec LAPI
 */
type Res = ResponseWithError<GetAllowlistsResponse>;
export async function getAllowlists(_: Request<object, Res>, res: Response<Res>): Promise<void> {
  try {
    const result = await container.useCases.blocklists.listAllowlists.execute();

    res.status(200).json(result);
  } catch (err) {
    log.error('Error fetching allowlists:', err);
    res
      .status(500)
      .json(errorResponse('Failed to fetch allowlists', err instanceof Error ? err.message : 'Unknown error'));
  }
}
