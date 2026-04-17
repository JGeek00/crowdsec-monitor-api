import { Router } from 'express';
import { getAllowlists, getAllowlistByName, checkAllowlist } from '@/controllers';
import { checkAllowlistValidators } from '@/validators';
import { handleValidationErrors, deprecate } from '@/middlewares';

const router: Router = Router();

/**
 * GET /api/v1/allowlists
 * Get all allowlists from CrowdSec LAPI
 */
router.get('/', deprecate('/api/v1/lists/allowlists'), getAllowlists);

/**
 * POST /api/v1/allowlists/check
 * Check if IPs are in any allowlist
 */
router.post('/check', deprecate('/api/v1/lists/check-ips'), checkAllowlistValidators, handleValidationErrors, checkAllowlist);

/**
 * GET /api/v1/allowlists/:allowlist_name
 * Get a specific allowlist from CrowdSec LAPI
 */
router.get('/:allowlist_name', deprecate('/api/v1/lists/allowlists/:allowlist_name'), getAllowlistByName);

export default router;
