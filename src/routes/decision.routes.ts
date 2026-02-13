import { Router } from 'express';
import { getAllDecisions, getDecisionById, getDecisionStats, createDecision } from '../controllers';
import { paginationValidators, decisionQueryValidators, createDecisionValidators } from '../validators';
import { handleValidationErrors } from '../middlewares';

const router = Router();

/**
 * @route   GET /api/decisions
 * @desc    Get all decisions (use ?only_active=true to filter active only)
 * @access  Public
 */
router.get(
  '/',
  [...paginationValidators, ...decisionQueryValidators],
  handleValidationErrors,
  getAllDecisions
);

/**
 * @route   POST /api/decisions
 * @desc    Create a decision in CrowdSec LAPI
 * @access  Public
 */
router.post(
  '/',
  createDecisionValidators,
  handleValidationErrors,
  createDecision
);

/**
 * @route   GET /api/decisions/stats
 * @desc    Get decisions statistics
 * @access  Public
 */
router.get('/stats', getDecisionStats);

/**
 * @route   GET /api/decisions/:id
 * @desc    Get decision by ID
 * @access  Public
 */
router.get('/:id', getDecisionById);

export default router;
