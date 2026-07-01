import { Router } from 'express';
import {
  getBlocklists,
  getBlocklistById,
  getBlocklistIps,
  createBlocklist,
  deleteBlocklist,
  toggleBlocklist,
  refreshSingleBlocklist,
  checkBlocklist,
  checkDomainBlocklist,
} from '@/controllers';
import {
  paginationValidators,
  checkBlocklistValidators,
  checkDomainBlocklistValidators,
  createBlocklistValidators,
} from '@/validators';
import { handleValidationErrors } from '@/middlewares';

const router: Router = Router();

/**
 * @route   GET /api/blocklists
 * @desc    Get all blocklists from the local database
 * @access  Authentication (configurable)
 */
router.get('/', getBlocklists);

/**
 * @route   POST /api/blocklists/check
 * @desc    Check if IPs are in any blocklist
 * @access  Authentication (configurable)
 * @deprecated Use /api/lists/check-ips
 */
router.post('/check', checkBlocklistValidators, handleValidationErrors, checkBlocklist);

/**
 * @route   POST /api/blocklists/check-domain
 * @desc    Check if an IP assigned to a domain is in any blocklist
 * @access  Authentication (configurable)
 * @deprecated Use /api/lists/check-domain
 */
router.post('/check-domain', checkDomainBlocklistValidators, handleValidationErrors, checkDomainBlocklist);

/**
 * @route   POST /api/blocklists
 * @desc    Add a new blocklist URL (body: { url, name })
 * @access  Authentication (configurable)
 */
router.post('/', createBlocklistValidators, handleValidationErrors, createBlocklist);

/**
 * @route   GET /api/blocklists/:id
 * @desc    Get a specific blocklist by ID
 * @access  Authentication (configurable)
 */
router.get('/:id', getBlocklistById);

/**
 * @route   GET /api/blocklists/:id/ips
 * @desc    Get paginated IPs for a specific blocklist
 * @access  Authentication (configurable)
 */
router.get('/:id/ips', paginationValidators, handleValidationErrors, getBlocklistIps);

/**
 * @route   DELETE /api/blocklists/:id
 * @desc    Delete a blocklist and all its associated IPs
 * @access  Authentication (configurable)
 */
router.delete('/:id', deleteBlocklist);

/**
 * @route   POST /api/blocklists/:id/enabled
 * @desc    Enable or disable a blocklist (body: { enabled })
 * @access  Authentication (configurable)
 */
router.post('/:id/enabled', toggleBlocklist);

/**
 * @route   POST /api/blocklists/:id/refresh
 * @desc    Refresh a single blocklist (fetch, parse, push to CrowdSec)
 * @access  Authentication (configurable)
 */
router.post('/:id/refresh', refreshSingleBlocklist);

export default router;
