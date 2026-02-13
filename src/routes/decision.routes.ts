import { Router } from 'express';
import { getAllDecisions, getDecisionById, getActiveDecisions, getDecisionStats } from '../controllers';
import { paginationValidators, decisionQueryValidators } from '../validators';
import { handleValidationErrors } from '../middlewares';

const router = Router();

/**
 * @route   GET /api/decisions
 * @desc    Get all decisions
 * @access  Public
 */
router.get(
  '/',
  [...paginationValidators, ...decisionQueryValidators],
  handleValidationErrors,
  getAllDecisions
);

/**
 * @route   GET /api/decisions/active
 * @desc    Get active decisions
 * @access  Public
 */
router.get('/active', getActiveDecisions);

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
