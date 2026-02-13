import { Router } from 'express';
import { getAllAlerts, getAlertById, getAlertStats } from '../controllers';
import { paginationValidators, alertQueryValidators } from '../validators';
import { handleValidationErrors } from '../middlewares';

const router = Router();

/**
 * @route   GET /api/alerts
 * @desc    Get all alerts
 * @access  Public
 */
router.get(
  '/',
  [...paginationValidators, ...alertQueryValidators],
  handleValidationErrors,
  getAllAlerts
);

/**
 * @route   GET /api/alerts/stats
 * @desc    Get alerts statistics
 * @access  Public
 */
router.get('/stats', getAlertStats);

/**
 * @route   GET /api/alerts/:id
 * @desc    Get alert by ID
 * @access  Public
 */
router.get('/:id', getAlertById);

export default router;
