import { Request, Response } from 'express';
import type {
  GetBlocklistIpsParams,
  GetBlocklistsQueryParams,
  GetBlocklistsResponse,
  ResponseWithError,
} from '@/delivery/http/contracts';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';

/**
 * Get all blocklists (api-managed first, then cs-managed).
 * Query params:
 *   - include_ips=full       → include blocklistIps as full objects
 *   - include_ips=ip_string  → include blocklistIps as plain IP strings
 *   - unpaged=true          → return all results without pagination
 *   - limit / offset        → pagination (default limit 100, offset 0)
 *   - get_only=blocklists   → return only api-managed blocklists
 *   - get_only=cs_blocklists → return only cs-managed blocklists
 */
type Res = ResponseWithError<GetBlocklistsResponse>;
export async function getBlocklists(
  req: Request<GetBlocklistIpsParams, Res, object, GetBlocklistsQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const response = await container.useCases.blocklists.listBlocklists.execute(req.query);
    res.status(200).json(response as GetBlocklistsResponse);
  } catch (err) {
    if (signal.aborted) return;
    log.error('Error fetching blocklists:', err);
    res
      .status(500)
      .json(errorResponse('Failed to fetch blocklists', err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
