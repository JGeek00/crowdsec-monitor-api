import { Router } from 'express';
import { getAllowlists, getAllowlistByName, checkAllowlist } from '../controllers';
import { checkAllowlistValidators } from '../validators';
import { handleValidationErrors } from '../middlewares';

const router = Router();

/**
 * GET /api/v1/allowlists
 * Get all allowlists from CrowdSec LAPI
 */
router.get('/', getAllowlists);

/**
 * POST /api/v1/allowlists/check
 * Check if IPs are in any allowlist
 */
router.post('/check', checkAllowlistValidators, handleValidationErrors, checkAllowlist);

/**
 * GET /api/v1/allowlists/:allowlist_name
 * Get a specific allowlist from CrowdSec LAPI
 */
router.get('/:allowlist_name', getAllowlistByName);

export default router;
