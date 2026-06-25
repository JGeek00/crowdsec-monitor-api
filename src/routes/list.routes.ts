import { Router } from 'express';
import blocklistRoutes from '@/routes/blocklist.routes';
import allowlistRoutes from '@/routes/allowlist.routes';
import { handleValidationErrors } from '@/middlewares';
import { checkBlocklistValidators, checkDomainBlocklistValidators } from '@/validators/blocklist.validator';
import { checkDomainInList, checkIpsInList } from '@/controllers';

const router: Router = Router();

router.use('/blocklists', blocklistRoutes);
router.use('/allowlists', allowlistRoutes);

/**
 * @route   POST /api/lists/check-ips
 * @desc    Check if IPs are in any list (blocklist or allowlist)
 * @access  Authentication (configurable)
 */
router.post('/check-ips', checkBlocklistValidators, handleValidationErrors, checkIpsInList);

/**
 * @route   POST /api/lists/check-domain
 * @desc    Check if an IP assigned to a domain is in any list (blocklist or allowlist)
 * @access  Authentication (configurable)
 */
router.post('/check-domain', checkDomainBlocklistValidators, handleValidationErrors, checkDomainInList);

export default router;
