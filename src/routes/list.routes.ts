import { Router } from 'express';
import blocklistRoutes from '@/routes/blocklist.routes';
import allowlistRoutes from '@/routes/allowlist.routes';
import { handleValidationErrors, optionalAuth } from '@/middlewares';
import { checkBlocklistValidators, checkDomainBlocklistValidators } from '@/validators/blocklist.validator';
import { checkDomainInList, checkIpsInList } from '@/controllers';

const router: Router = Router();

router.get('/blocklists', optionalAuth, blocklistRoutes);
router.get('/allowlists', optionalAuth, allowlistRoutes);

/**
 * POST /api/v1/lists/check-ips
 * Check if IPs are in any list (blocklist or allowlist)
 */
router.post('/check-ips', checkBlocklistValidators, handleValidationErrors, checkIpsInList);

/**
 * POST /api/v1/lists/check-domain
 * Checks if an IP assigned to a domain is in any list (blocklist or allowlist)
 */
router.post('/check-domain', checkDomainBlocklistValidators, handleValidationErrors, checkDomainInList);

export default router;
