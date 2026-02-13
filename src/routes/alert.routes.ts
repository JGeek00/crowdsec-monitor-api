import { Router } from 'express';
import { alertController } from '../controllers/alert.controller';

const router = Router();

/**
 * @route   GET /api/alerts
 * @desc    Get all alerts
 * @access  Public
 */
router.get('/', (req, res) => alertController.getAll(req, res));

/**
 * @route   GET /api/alerts/stats
 * @desc    Get alerts statistics
 * @access  Public
 */
router.get('/stats', (req, res) => alertController.getStats(req, res));

/**
 * @route   GET /api/alerts/:id
 * @desc    Get alert by ID
 * @access  Public
 */
router.get('/:id', (req, res) => alertController.getById(req, res));

export default router;
