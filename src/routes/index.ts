import { Router } from 'express';
import alertRoutes from '@/routes/alert.routes';
import decisionRoutes from '@/routes/decision.routes';
import allowlistRoutes from '@/routes/allowlist.routes';
import blocklistRoutes from '@/routes/blocklist.routes';
import statisticsRoutes from '@/routes/statistics.routes';
import statusRoutes from '@/routes/status.routes';
import processRoutes from '@/routes/process.routes';
import { optionalAuth } from '@/middlewares';

const router: Router = Router();

// Mount routes with optional authentication
router.use('/alerts', optionalAuth, alertRoutes);
router.use('/decisions', optionalAuth, decisionRoutes);
router.use('/allowlists', optionalAuth, allowlistRoutes);
router.use('/blocklists', optionalAuth, blocklistRoutes);
router.use('/statistics', optionalAuth, statisticsRoutes);
router.use('/processes', optionalAuth, processRoutes);

// Mount status routes
router.use('/', statusRoutes);

export default router;
