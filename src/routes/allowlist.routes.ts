import { Router } from 'express';
import { getAllowlists, getAllowlistByName, checkAllowlist } from '@/controllers';
import { checkAllowlistValidators } from '@/validators';
import { handleValidationErrors } from '@/middlewares';

const router: Router = Router();

/**
 * @route   GET /api/allowlists
 * @desc    Get all allowlists from CrowdSec LAPI
 * @access  Authentication (configurable)
 */
router.get('/', getAllowlists);

/**
 * @route   POST /api/allowlists/check
 * @desc    Check if IPs are in any allowlist
 * @access  Authentication (configurable)
 * @deprecated Use /api/lists/check-ips
 */
router.post('/check', checkAllowlistValidators, handleValidationErrors, checkAllowlist);

/**
 * @route   GET /api/allowlists/:allowlist_name
 * @desc    Get a specific allowlist from CrowdSec LAPI
 * @access  Authentication (configurable)
 */
router.get('/:allowlist_name', getAllowlistByName);

export default router;
