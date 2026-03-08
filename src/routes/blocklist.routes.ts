import { Router } from 'express';
import { getBlocklists, getBlocklistById } from '../controllers';

const router = Router();

/**
 * GET /api/v1/blocklists
 * Get all blocklists from the local database
 */
router.get('/', getBlocklists);

/**
 * GET /api/v1/blocklists/:id
 * Get a specific blocklist by ID
 */
router.get('/:id', getBlocklistById);

export default router;
