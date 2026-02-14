import { query, ValidationChain } from 'express-validator';

/**
 * Validation rules for statistics query parameters
 */
export const statisticsQueryValidators: ValidationChain[] = [
  query('since')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('since must be in yyyy-mm-dd format')
    .custom((value) => {
      const sinceDate = new Date(value);
      sinceDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(sinceDate.getTime())) {
        throw new Error('Invalid date');
      }

      if (sinceDate >= today) {
        throw new Error('since date must be in the past (not today or future dates)');
      }

      return true;
    }),
  
  query('amount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('amount must be a positive integer')
    .toInt(),
];
