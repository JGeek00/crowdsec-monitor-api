import { body, ValidationChain } from 'express-validator';

/**
 * Validation rules for creating a decision (POST /v1/decisions)
 */
export const createDecisionValidators: ValidationChain[] = [
  body('ip')
    .notEmpty()
    .withMessage('ip is required')
    .custom((value) => {
      // Validate IPv4 or IPv6
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}$|^[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}$|^[a-fA-F0-9]{1,4}:[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,4}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,2}[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,3}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,3}[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,2}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,4}[a-fA-F0-9]{1,4}::[a-fA-F0-9]{1,4}:[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}::[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}::$/;
      return ipv4Regex.test(value) || ipv6Regex.test(value);
    })
    .withMessage('ip must be a valid IPv4 or IPv6 address'),

  body('duration')
    .notEmpty()
    .withMessage('duration is required')
    .matches(/^-?\d+(\.\d+)?(ns|us|µs|ms|s|m|h|d|w)$/)
    .withMessage('duration must be in CrowdSec format (e.g., 2m, 10h, 1d, 3w)'),

  body('reason')
    .notEmpty()
    .withMessage('reason is required')
    .matches(/^[a-zA-Z0-9., ]+$/)
    .withMessage('reason must contain only letters, numbers, spaces, dots and commas'),

  body('type')
    .notEmpty()
    .withMessage('type is required')
    .isIn(['ban', 'captcha', 'throttle', 'allow'])
    .withMessage('type must be one of: ban, captcha, throttle, allow'),
];
