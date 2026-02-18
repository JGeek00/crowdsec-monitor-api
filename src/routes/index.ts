import { Router } from 'express';
import alertRoutes from './alert.routes';
import decisionRoutes from './decision.routes';
import statisticsRoutes from './statistics.routes';
import statusRoutes from './status.routes';
import { optionalAuth } from '../middlewares';

const router = Router();

// Mount routes with optional authentication
router.use('/alerts', optionalAuth, alertRoutes);
router.use('/decisions', optionalAuth, decisionRoutes);
router.use('/statistics', optionalAuth, statisticsRoutes);

// Mount status routes
router.use('/', statusRoutes);

export default router;
