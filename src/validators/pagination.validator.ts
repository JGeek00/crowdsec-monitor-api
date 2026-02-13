import { query, ValidationChain } from 'express-validator';

/**
 * Validation rules for pagination query parameters
 */
export const paginationValidators: ValidationChain[] = [
  query('limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('limit must be a positive integer')
    .toInt(),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer')
    .toInt(),
  
  query('unpaged')
    .optional()
    .isBoolean()
    .withMessage('unpaged must be a boolean (true or false)')
    .toBoolean(),
];

/**
 * Validation rules for alert-specific query parameters
 */
export const alertQueryValidators: ValidationChain[] = [
  query('scenario')
    .optional()
    .isString()
    .trim(),
  
  query('simulated')
    .optional()
    .isBoolean()
    .withMessage('simulated must be a boolean (true or false)')
    .toBoolean(),
];

/**
 * Validation rules for decision-specific query parameters
 */
export const decisionQueryValidators: ValidationChain[] = [
  query('type')
    .optional()
    .isString()
    .trim(),
  
  query('scope')
    .optional()
    .isString()
    .trim(),
  
  query('value')
    .optional()
    .isString()
    .trim(),
  
  query('simulated')
    .optional()
    .isBoolean()
    .withMessage('simulated must be a boolean (true or false)')
    .toBoolean(),
];
