import { Request, Response } from 'express';
import type {
  GetBlocklistIpsParams,
  GetBlocklistIpsQueryParams,
  GetBlocklistIpsResponse,
  ResponseWithError,
} from '@/delivery/http/contracts';
import { createRequestSignal } from '@/utils/request-signal';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';
import { NotFoundError } from '@/domain/errors';

/**
 * Get IPs for a specific blocklist with pagination.
 * Works for both api-managed (blocklist_id) and cs-managed (cs_blocklist_id) blocklists.
 * Query params:
 *   - ip_string=true → return plain IP strings instead of full objects
 *   - limit          → results per page (default 50)
 *   - offset         → pagination offset (default 0)
 *   - unpaged        → return all results without pagination
 */
type Res = ResponseWithError<GetBlocklistIpsResponse>;
export async function getBlocklistIps(
  req: Request<GetBlocklistIpsParams, Res, object, GetBlocklistIpsQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, unpaged, ip_string } = req.query;

    const response = await container.useCases.blocklists.getBlocklistIps.execute(id, {
      limit: Number(limit),
      offset: Number(offset),
      unpaged: unpaged === true,
      onlyStrings: ip_string === 'true',
    });

    res.status(200).json(response as GetBlocklistIpsResponse);
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'BlocklistsTable not found'));
      return;
    }
    log.error('Error fetching blocklist IPs:', err);
    res
      .status(500)
      .json(errorResponse('Failed to fetch blocklist IPs', err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
