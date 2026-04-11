import { Router } from 'express';
import { healthCheck } from '@/controllers/status/health.controller';
import { getStatus } from '@/controllers/status/status.controller';
import { checkCredentials } from '@/controllers/status/check-credentials.controller';
import { optionalAuth } from '@/middlewares';

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
 * @access  Optional authentication
 */
router.get('/status', optionalAuth, getStatus);

/**
 * @route   GET /api/status/check-credentials
 * @desc    Check if the provided credentials are valid
 * @access  Optional authentication
 */
router.get('/check-credentials', optionalAuth, checkCredentials);

export default router;
