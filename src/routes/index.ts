import { Router } from 'express';
import alertRoutes from '@/routes/alert.routes';
import decisionRoutes from '@/routes/decision.routes';
import listRoutes from '@/routes/list.routes';
import allowlistRoutes from '@/routes/allowlist.routes';
import blocklistRoutes from '@/routes/blocklist.routes';
import statisticsRoutes from '@/routes/statistics.routes';
import statusRoutes from '@/routes/status.routes';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

const router: Router = Router();

// Mount HTTP routes with authentication
router.use('/alerts', AuthMiddleware.expressAuth, alertRoutes);
router.use('/decisions', AuthMiddleware.expressAuth, decisionRoutes);
router.use('/lists', AuthMiddleware.expressAuth, listRoutes);
router.use('/allowlists', AuthMiddleware.expressAuth, allowlistRoutes);
router.use('/blocklists', AuthMiddleware.expressAuth, blocklistRoutes);
router.use('/statistics', AuthMiddleware.expressAuth, statisticsRoutes);

// Mount status routes
router.use('/', statusRoutes);

export default router;
