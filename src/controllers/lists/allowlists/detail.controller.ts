import { Request, Response } from 'express';
import { GetAllowlistParams, GetAllowlistResponse, ResponseWithError } from '@/models';
import { crowdSecAPI } from '@/services';
import { isValidDate } from '@/utils/date-validator';
import { CrowdSecAllowlist } from '@/types/crowdsec.types';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';

/**
 * Sanitize allowlist items by converting invalid expiration dates to null
 */
function sanitizeAllowlist(allowlist: CrowdSecAllowlist): CrowdSecAllowlist {
  return {
    ...allowlist,
    items: allowlist.items.map((item) => ({
      ...item,
      expiration: isValidDate(item.expiration) ? item.expiration : null,
    })),
  };
}

/**
 * Get a specific allowlist by name from CrowdSec LAPI
 */
type Res = ResponseWithError<GetAllowlistResponse>;
export async function getAllowlistByName(req: Request<GetAllowlistParams, Res>, res: Response<Res>): Promise<void> {
  try {
    const allowlist_name = req.params.allowlist_name;

    const allowlist = await crowdSecAPI.allowlists.getAllowlistByName(allowlist_name);

    if (!allowlist) {
      res.status(404).json(errorResponse('Allowlist not found', `Allowlist '${allowlist_name}' was not found`));
      return;
    }

    const sanitizedAllowlist = sanitizeAllowlist(allowlist);

    res.status(200).json({
      data: sanitizedAllowlist,
    });
  } catch (err) {
    log.error('Error fetching allowlist:', err);
    res
      .status(500)
      .json(errorResponse('Failed to fetch allowlist', err instanceof Error ? err.message : 'Unknown error'));
  }
}
