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
 * Deprecated: use /api/v1/lists/check-ips
 */
router.post('/check', checkBlocklistValidators, handleValidationErrors, checkBlocklist);

/**
 * POST /api/v1/blocklists/check-domain
 * Checks if an IP assigned to a domain is in any blocklist
 * Deprecated: use /api/v1/lists/check-domain
 */
router.post('/check-domain', checkDomainBlocklistValidators, handleValidationErrors, checkDomainBlocklist);

/**
 * POST /api/v1/blocklists
 * Add a new blocklist URL
 * Body: { url: string, name: string }
 */
router.post('/', createBlocklistValidators, handleValidationErrors, createBlocklist);

/**
 * GET /api/v1/blocklists/:id
 * Get a specific blocklist by ID
 */
router.get('/:id', getBlocklistById);

/**
 * GET /api/v1/blocklists/:id/ips
 * Get paginated IPs for a specific blocklist
 */
router.get('/:id/ips', paginationValidators, handleValidationErrors, getBlocklistIps);

/**
 * DELETE /api/v1/blocklists/:id
 * Delete a blocklist and all its associated IPs
 */
router.delete('/:id', deleteBlocklist);

/**
 * POST /api/v1/blocklists/:id/enabled
 * Enable or disable a blocklist
 * Body: { enabled: boolean }
 */
router.post('/:id/enabled', toggleBlocklist);

export default router;
