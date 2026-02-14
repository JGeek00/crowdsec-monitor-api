import { Router } from 'express';
import { getAllAlerts, getAlertById, getAlertStats, deleteAlert } from '../controllers';
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

/**
 * @route   DELETE /api/alerts/:id
 * @desc    Delete alert by ID from CrowdSec LAPI
 * @access  Public
 */
router.delete('/:id', deleteAlert);

export default router;
