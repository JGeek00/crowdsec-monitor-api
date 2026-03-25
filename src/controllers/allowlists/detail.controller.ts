import { Request, Response } from 'express';
import { crowdSecAPI } from '@/services';
import { isValidDate } from '@/utils/date-validator';
import { CrowdSecAllowlist } from '@/types/crowdsec.types';
import { errorResponse } from '@/utils/error-response';

/**
 * Sanitize allowlist items by converting invalid expiration dates to null
 */
function sanitizeAllowlist(allowlist: CrowdSecAllowlist): CrowdSecAllowlist {
  return {
    ...allowlist,
    items: allowlist.items.map(item => ({
      ...item,
      expiration: isValidDate(item.expiration) ? item.expiration : null,
    })),
  };
}

/**
 * Get a specific allowlist by name from CrowdSec LAPI
 */
export async function getAllowlistByName(req: Request, res: Response): Promise<void> {
  try {
    const allowlist_name = req.params.allowlist_name as string;

    const allowlist = await crowdSecAPI.getAllowlistByName(allowlist_name);

    if (!allowlist) {
      res.status(404).json(errorResponse('Allowlist not found', `Allowlist '${allowlist_name}' was not found`));
      return;
    }

    const sanitizedAllowlist = sanitizeAllowlist(allowlist);

    res.status(200).json({
      data: sanitizedAllowlist,
    });
  } catch (error) {
    console.error('Error fetching allowlist:', error);
    res.status(500).json(errorResponse('Failed to fetch allowlist', error instanceof Error ? error.message : 'Unknown error'));
  }
}
