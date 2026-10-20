import { Router } from 'express';
import blocklistRoutes from '@/delivery/http/routes/blocklist.routes';
import allowlistRoutes from '@/delivery/http/routes/allowlist.routes';
import { handleValidationErrors } from '@/delivery/http/middlewares';
import { checkBlocklistValidators, checkDomainBlocklistValidators } from '@/delivery/http/schemas/blocklist.validator';
import { checkDomainInList, checkIpsInList } from '@/delivery/http/controllers';
import { refreshLists } from '@/delivery/http/controllers/lists/refresh.controller';

const router: Router = Router();

router.use('/blocklists', blocklistRoutes);
router.use('/allowlists', allowlistRoutes);

/**
 * @route   POST /api/v1/lists/refresh
 * @desc    Trigger a manual blocklist and allowlist refresh
 * @access  Authentication (configurable)
 */
router.post('/refresh', refreshLists);

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
