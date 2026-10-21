import { Request, Response } from 'express';
import type {
  GetBlocklistParams,
  GetBlocklistQueryParams,
  GetBlocklistResponse,
  ResponseWithError,
} from '@/delivery/http/contracts';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';
import { NotFoundError } from '@/domain/errors';

/**
 * Get a specific blocklist by ID.
 * Looks up api-managed blocklists first, then cs-managed blocklists.
 * Query params:
 *   - include_ips=full       → include blocklistIps as full objects
 *   - include_ips=ip_string  → include blocklistIps as plain IP strings
 */
type Res = ResponseWithError<GetBlocklistResponse>;
export async function getBlocklistById(
  req: Request<GetBlocklistParams, Res, object, GetBlocklistQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { id } = req.params;
    const includeIps = req.query.include_ips === 'full' || req.query.include_ips === 'ip_string';
    const onlyIps = req.query.include_ips === 'ip_string';

    const canonical = await container.useCases.blocklists.getBlocklist.execute(id, includeIps, onlyIps);
    res.status(200).json({ data: canonical } as GetBlocklistResponse);
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
      return;
    }
    log.error('Error fetching blocklist:', err);
    res
      .status(500)
      .json(errorResponse('Failed to fetch blocklist', err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
