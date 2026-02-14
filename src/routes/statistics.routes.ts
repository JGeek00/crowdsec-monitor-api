import { Router } from 'express';
import { 
  getStatistics, 
  getTopCountries, 
  getTopScenarios, 
  getTopIpOwners, 
  getTopTargets,
  getCountryHistory,
  getScenarioHistory,
  getIpOwnerHistory,
  getTargetHistory
} from '../controllers';
import { statisticsQueryValidators } from '../validators';
import { handleValidationErrors } from '../middlewares';

const router = Router();

/**
 * @route   GET /api/statistics
 * @desc    Get comprehensive statistics
 * @access  Public
 */
router.get(
  '/',
  statisticsQueryValidators,
  handleValidationErrors,
  getStatistics
);

/**
 * @route   GET /api/statistics/countries
 * @desc    Get top countries full list
 * @access  Public
 */
router.get('/countries', getTopCountries);

/**
 * @route   GET /api/statistics/scenarios
 * @desc    Get top scenarios full list
 * @access  Public
 */
router.get('/scenarios', getTopScenarios);

/**
 * @route   GET /api/statistics/ip-owners
 * @desc    Get top IP owners full list
 * @access  Public
 */
router.get('/ip-owners', getTopIpOwners);

/**
 * @route   GET /api/statistics/targets
 * @desc    Get top targets full list
 * @access  Public
 */
router.get('/targets', getTopTargets);

/**
 * @route   GET /api/statistics/countries/:item
 * @desc    Get history for a specific country
 * @access  Public
 */
router.get('/countries/:item', getCountryHistory);

/**
 * @route   GET /api/statistics/scenarios/:item
 * @desc    Get history for a specific scenario
 * @access  Public
 */
router.get('/scenarios/:item', getScenarioHistory);

/**
 * @route   GET /api/statistics/ip-owners/:item
 * @desc    Get history for a specific IP owner
 * @access  Public
 */
router.get('/ip-owners/:item', getIpOwnerHistory);

/**
 * @route   GET /api/statistics/targets/:item
 * @desc    Get history for a specific target
 * @access  Public
 */
router.get('/targets/:item', getTargetHistory);

export default router;
