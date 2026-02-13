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
    .custom((value) => {
      // Accept both single string and array of strings
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) {
        return value.every(item => typeof item === 'string');
      }
      return false;
    })
    .withMessage('scenario must be a string or array of strings'),
  
  query('simulated')
    .optional()
    .isBoolean()
    .withMessage('simulated must be a boolean (true or false)')
    .toBoolean(),
  
  query('ip_address')
    .optional()
    .custom((value) => {
      const values = Array.isArray(value) ? value : [value];
      return values.every(ip => {
        // Validate IPv4 or IPv6
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}$|^[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}$|^[a-fA-F0-9]{1,4}:[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,4}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,2}[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,3}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,3}[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,2}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,4}[a-fA-F0-9]{1,4}::[a-fA-F0-9]{1,4}:[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}::[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}::$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
      });
    })
    .withMessage('ip_address must be a valid IPv4 or IPv6 address'),
  
  query('country')
    .optional()
    .custom((value) => {
      const values = Array.isArray(value) ? value : [value];
      return values.every(country => {
        // Validate 2-letter country code (ISO 3166-1 alpha-2)
        return typeof country === 'string' && /^[A-Z]{2}$/i.test(country);
      });
    })
    .withMessage('country must be a 2-letter country code (ISO 3166-1 alpha-2)'),
  
  query('ip_owner')
    .optional()
    .custom((value) => {
      // Accept both single string and array of strings (no content validation)
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) {
        return value.every(item => typeof item === 'string');
      }
      return false;
    })
    .withMessage('ip_owner must be a string or array of strings'),
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
  
  query('scenario')
    .optional()
    .custom((value) => {
      // Accept both single string and array of strings
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) {
        return value.every(item => typeof item === 'string');
      }
      return false;
    })
    .withMessage('scenario must be a string or array of strings'),
  
  query('ip_address')
    .optional()
    .custom((value) => {
      const values = Array.isArray(value) ? value : [value];
      return values.every(ip => {
        // Validate IPv4 or IPv6
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}$|^[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}$|^[a-fA-F0-9]{1,4}:[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,4}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,2}[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,3}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,3}[a-fA-F0-9]{1,4}::(?:[a-fA-F0-9]{1,4}:){0,2}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,4}[a-fA-F0-9]{1,4}::[a-fA-F0-9]{1,4}:[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}::[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}::$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
      });
    })
    .withMessage('ip_address must be a valid IPv4 or IPv6 address'),
  
  query('country')
    .optional()
    .custom((value) => {
      const values = Array.isArray(value) ? value : [value];
      return values.every(country => {
        // Validate 2-letter country code (ISO 3166-1 alpha-2)
        return typeof country === 'string' && /^[A-Z]{2}$/i.test(country);
      });
    })
    .withMessage('country must be a 2-letter country code (ISO 3166-1 alpha-2)'),
  
  query('ip_owner')
    .optional()
    .custom((value) => {
      // Accept both single string and array of strings (no content validation)
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) {
        return value.every(item => typeof item === 'string');
      }
      return false;
    })
    .withMessage('ip_owner must be a string or array of strings'),
  
  query('only_active')
    .optional()
    .isBoolean()
    .withMessage('only_active must be a boolean (true or false)')
    .toBoolean(),
];
