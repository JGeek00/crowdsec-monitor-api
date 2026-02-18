import { Router } from 'express';
import { getAllDecisions, getDecisionById, getDecisionStats, createDecision, deleteDecision } from '../controllers';
import { paginationValidators, decisionQueryValidators, createDecisionValidators } from '../validators';
import { handleValidationErrors } from '../middlewares';

const router = Router();

/**
 * @route   GET /api/decisions
 * @desc    Get all decisions (use ?only_active=true to filter active only)
 * @access  Optional authentication
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
 * @access  Optional authentication
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
 * @access  Optional authentication
 */
router.get('/stats', getDecisionStats);

/**
 * @route   GET /api/decisions/:id
 * @desc    Get decision by ID
 * @access  Optional authentication
 */
router.get('/:id', getDecisionById);

/**
 * @route   DELETE /api/decisions/:id
 * @desc    Delete decision by ID from CrowdSec LAPI
 * @access  Optional authentication
 */
router.delete('/:id', deleteDecision);

export default router;
