import { Router } from 'express';
import { decisionController } from '../controllers/decision.controller';

const router = Router();

/**
 * @route   GET /api/decisions
 * @desc    Get all decisions
 * @access  Public
 */
router.get('/', (req, res) => decisionController.getAll(req, res));

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
