import { Router, Request, Response } from 'express';
import { decisionController } from '../controllers/decision.controller';
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
  (req: Request, res: Response) => decisionController.getAll(req, res)
);

/**
 * @route   GET /api/decisions/active
 * @desc    Get active decisions
 * @access  Public
 */
router.get('/active', (req, res) => decisionController.getActive(req, res));

/**
 * @route   GET /api/decisions/stats
 * @desc    Get decisions statistics
 * @access  Public
 */
router.get('/stats', (req, res) => decisionController.getStats(req, res));

/**
 * @route   GET /api/decisions/:id
 * @desc    Get decision by ID
 * @access  Public
 */
router.get('/:id', (req, res) => decisionController.getById(req, res));

export default router;
