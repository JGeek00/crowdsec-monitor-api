import { Router } from 'express';
import { healthCheck } from '../controllers/status/health.controller';
import { getStatus } from '../controllers/status/status.controller';
import { optionalAuth } from '../middlewares';

const router = Router();

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

export default router;
