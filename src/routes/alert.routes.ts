import { Router } from 'express';
import { getAllAlerts, getAlertById, getAlertStats, deleteAlert } from '@/controllers';
import { paginationValidators, alertQueryValidators } from '@/validators';
import { handleValidationErrors } from '@/middlewares';

const router: Router= Router();

/**
 * @route   GET /api/alerts
 * @desc    Get all alerts
 * @access  Authentication (configurable)
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
 * @access  Authentication (configurable)
 */
router.get('/stats', getAlertStats);

/**
 * @route   GET /api/alerts/:id
 * @desc    Get alert by ID
 * @access  Authentication (configurable)
 */
router.get('/:id', getAlertById);

/**
 * @route   DELETE /api/alerts/:id
 * @desc    Delete alert by ID from CrowdSec LAPI
 * @access  Authentication (configurable)
 */
router.delete('/:id', deleteAlert);

export default router;
