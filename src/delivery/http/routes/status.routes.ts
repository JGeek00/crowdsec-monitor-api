import { Router } from 'express';
import { healthCheck } from '@/delivery/http/controllers/status/health.controller';
import { getStatus } from '@/delivery/http/controllers/status/status.controller';
import { checkCredentials } from '@/delivery/http/controllers/status/check-credentials.controller';
import { AuthMiddleware } from '@/delivery/http/middlewares/auth.middleware';

const router: Router = Router();

/**
 * @route   GET /api/health
 * @desc    Perform a health check of the API
 * @access  Public
 */
router.get('/health', healthCheck);

/**
 * @route   GET /api/status
 * @desc    Get comprehensive status information
 * @access  Authentication (configurable)
 */
router.get('/status', AuthMiddleware.expressAuth, getStatus);

/**
 * @route   GET /api/status/check-credentials
 * @desc    Check if the provided credentials are valid
 * @access  Authentication (configurable)
 */
router.get('/check-credentials', AuthMiddleware.expressAuth, checkCredentials);

export default router;
