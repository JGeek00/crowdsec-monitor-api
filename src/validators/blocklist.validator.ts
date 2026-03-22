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

/**
 * Validation rules for checking if a domain's route IPs are in blocklists (POST /v1/blocklists/check-domain)
 */
export const checkDomainBlocklistValidators: ValidationChain[] = [
  body('domain')
    .isString()
    .withMessage('domain must be a string')
    .notEmpty()
    .withMessage('domain cannot be empty')
    .isLength({ max: 253 })
    .withMessage('domain must be at most 253 characters')
    .custom((value: string) => {
      // Allows hostnames and subdomains: sub.example.com, example.co.uk
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      return domainRegex.test(value);
    })
    .withMessage('domain must be a valid domain name (subdomains are allowed)'),
];
