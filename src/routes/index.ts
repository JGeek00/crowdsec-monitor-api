import { Router } from 'express';
import alertRoutes from './alert.routes';
import decisionRoutes from './decision.routes';

const router = Router();

// Mount routes
router.use('/alerts', alertRoutes);
router.use('/decisions', decisionRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
