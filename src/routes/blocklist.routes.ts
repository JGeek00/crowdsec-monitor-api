import { Router } from 'express';
import { getBlocklists, getBlocklistById, getBlocklistIps } from '../controllers';
import { paginationValidators } from '../validators';
import { handleValidationErrors } from '../middlewares';

const router = Router();

/**
 * GET /api/v1/blocklists
 * Get all blocklists from the local database
 */
router.get('/', getBlocklists);

/**
 * GET /api/v1/blocklists/:blocklistId/ips
 * Get paginated IPs for a specific blocklist
 */
router.get(
  '/:blocklistId/ips',
  paginationValidators,
  handleValidationErrors,
  getBlocklistIps
);

/**
 * GET /api/v1/blocklists/:id
 * Get a specific blocklist by ID
 */
router.get('/:id', getBlocklistById);

export default router;
