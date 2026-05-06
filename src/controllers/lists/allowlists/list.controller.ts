import { Request, Response } from 'express';
import { crowdSecAPI } from '@/services';
import { isValidDate } from '@/utils/date-validator';
import { CrowdSecAllowlist } from '@/types/crowdsec.types';
import { errorResponse } from '@/utils/error-response';
import { GetAllowlistsResponse, ResponseWithError } from '@/models';

/**
 * Sanitize allowlist items by converting invalid expiration dates to null
 */
function sanitizeAllowlists(allowlists: CrowdSecAllowlist[]): CrowdSecAllowlist[] {
  return allowlists.map(allowlist => ({
    ...allowlist,
    items: allowlist.items.map(item => ({
      ...item,
      expiration: isValidDate(item.expiration) ? item.expiration : null,
    })),
  }));
}

/**
 * Get all allowlists from CrowdSec LAPI
 */
type Res = ResponseWithError<GetAllowlistsResponse>;
export async function getAllowlists(_: Request<{}, Res>, res: Response<Res>): Promise<void> {
  try {
    const allowlists = await crowdSecAPI.allowlists.getAllowlists();
    const sanitizedAllowlists = sanitizeAllowlists(allowlists);
    
    res.status(200).json({
      data: sanitizedAllowlists,
      length: sanitizedAllowlists.length,
    });
  } catch (error) {
    console.error('Error fetching allowlists:', error);
    res.status(500).json(errorResponse('Failed to fetch allowlists', error instanceof Error ? error.message : 'Unknown error'));
  }
}
