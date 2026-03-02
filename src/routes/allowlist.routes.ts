import { Router } from 'express';
import { getAllowlists, getAllowlistByName } from '../controllers';

const router = Router();

/**
 * GET /api/v1/allowlists
 * Get all allowlists from CrowdSec LAPI
 */
router.get('/', getAllowlists);

/**
 * GET /api/v1/allowlists/:allowlist_name
 * Get a specific allowlist from CrowdSec LAPI
 */
router.get('/:allowlist_name', getAllowlistByName);

export default router;
