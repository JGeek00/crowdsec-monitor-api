import { Router } from 'express';
import { getBlocklists, getBlocklistById, getBlocklistIps, createBlocklist, deleteBlocklist, toggleBlocklist, checkBlocklist, checkDomainBlocklist } from '@/controllers';
import { paginationValidators, checkBlocklistValidators, checkDomainBlocklistValidators, createBlocklistValidators } from '@/validators';
import { handleValidationErrors } from '@/middlewares';

const router: Router = Router();

/**
 * GET /api/v1/blocklists
 * Get all blocklists from the local database
 */
router.get('/', getBlocklists);

/**
 * POST /api/v1/blocklists/check
 * Check if IPs are in any blocklist
 */
router.post('/check', checkBlocklistValidators, handleValidationErrors, checkBlocklist);

/**
 * POST /api/v1/blocklists/check-domain
 * Run a traceroute to a domain and check if any hop IP is in any blocklist
 */
router.post('/check-domain', checkDomainBlocklistValidators, handleValidationErrors, checkDomainBlocklist);

/**
 * POST /api/v1/blocklists
 * Add a new blocklist URL
 * Body: { url: string, name: string }
 */
router.post('/', createBlocklistValidators, handleValidationErrors, createBlocklist);

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

/**
 * DELETE /api/v1/blocklists/:id
 * Delete a blocklist and all its associated IPs
 */
router.delete('/:id', deleteBlocklist);

/**
 * POST /api/v1/blocklists/:blocklistId/enabled
 * Enable or disable a blocklist
 * Body: { enabled: boolean }
 */
router.post('/:blocklistId/enabled', toggleBlocklist);

export default router;
