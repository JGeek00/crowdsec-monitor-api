import { body, ValidationChain } from 'express-validator';
import { ipv4Regex, ipv6Regex } from '../constants/regexps';

/**
 * Validation rules for checking if IPs are in blocklists (POST /v1/blocklists/check)
 */
export const checkBlocklistValidators: ValidationChain[] = [
  body('ips')
    .isArray()
    .withMessage('ips must be an array')
    .notEmpty()
    .withMessage('ips array cannot be empty'),

  body('ips.*')
    .custom((value) => {
      return ipv4Regex.test(value) || ipv6Regex.test(value);
    })
    .withMessage('each IP must be a valid IPv4 or IPv6 address'),
];
