import { Router } from 'express';
import alertRoutes from '@/delivery/http/routes/alert.routes';
import decisionRoutes from '@/delivery/http/routes/decision.routes';
import listRoutes from '@/delivery/http/routes/list.routes';
import allowlistRoutes from '@/delivery/http/routes/allowlist.routes';
import blocklistRoutes from '@/delivery/http/routes/blocklist.routes';
import statisticsRoutes from '@/delivery/http/routes/statistics.routes';
import notificationRoutes from '@/delivery/http/routes/notification.routes';
import notificationChannelRoutes from '@/delivery/http/routes/notification-channel.routes';
import statusRoutes from '@/delivery/http/routes/status.routes';
import { AuthMiddleware } from '@/delivery/http/middlewares/auth.middleware';

const router: Router = Router();

// Mount HTTP routes with authentication
router.use('/alerts', AuthMiddleware.expressAuth, alertRoutes);
router.use('/decisions', AuthMiddleware.expressAuth, decisionRoutes);
router.use('/lists', AuthMiddleware.expressAuth, listRoutes);
router.use('/allowlists', AuthMiddleware.expressAuth, allowlistRoutes);
router.use('/blocklists', AuthMiddleware.expressAuth, blocklistRoutes);
router.use('/statistics', AuthMiddleware.expressAuth, statisticsRoutes);
router.use('/notifications', AuthMiddleware.expressAuth, notificationRoutes);
router.use('/notification-channels', AuthMiddleware.expressAuth, notificationChannelRoutes);

// Mount status routes
router.use('/', statusRoutes);

export default router;
