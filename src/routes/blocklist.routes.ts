import { Router } from 'express';
import { getBlocklists, getBlocklistById, getBlocklistIps, createBlocklist, deleteBlocklist, toggleBlocklist, checkBlocklist, checkDomainBlocklist } from '@/controllers';
import { paginationValidators, checkBlocklistValidators, checkDomainBlocklistValidators, createBlocklistValidators } from '@/validators';
import { handleValidationErrors, deprecate } from '@/middlewares';

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
router.post('/check', deprecate('/api/v1/lists/check-ips'), checkBlocklistValidators, handleValidationErrors, checkBlocklist);

/**
 * POST /api/v1/blocklists/check-domain
 * Checks if an IP assigned to a domain is in any blocklist
 * Deprecated: use /api/v1/lists/check-domain
 */
router.post('/check-domain', deprecate('/api/v1/lists/check-domain'), checkDomainBlocklistValidators, handleValidationErrors, checkDomainBlocklist);

/**
 * POST /api/v1/blocklists
 * Add a new blocklist URL
 * Body: { url: string, name: string }
 */
router.post('/', deprecate('/api/v1/lists/blocklists'), createBlocklistValidators, handleValidationErrors, createBlocklist);

/**
 * GET /api/v1/blocklists/:blocklistId/ips
 * Get paginated IPs for a specific blocklist
 */
router.get(
  '/:blocklistId/ips',
  deprecate('/api/v1/lists/blocklists/ips'),
  paginationValidators,
  handleValidationErrors,
  getBlocklistIps
);

/**
 * GET /api/v1/blocklists/:id
 * Get a specific blocklist by ID
 */
router.get('/:id', deprecate('/api/v1/lists/blocklists/:id'), getBlocklistById);

/**
 * DELETE /api/v1/blocklists/:id
 * Delete a blocklist and all its associated IPs
 */
router.delete('/:id', deprecate('/api/v1/lists/blocklists/:id'), deleteBlocklist);

/**
 * POST /api/v1/blocklists/:blocklistId/enabled
 * Enable or disable a blocklist
 * Body: { enabled: boolean }
 */
router.post('/:blocklistId/enabled', deprecate('/api/v1/lists/blocklists/:blocklistId/enabled'), toggleBlocklist);

export default router;
