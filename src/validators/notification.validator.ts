import { body, param, ValidationChain } from 'express-validator';

const conditionShape = (path: string, optional: boolean): ValidationChain[] => {
  const chain = optional ? body(path).optional() : body(path);
  return [
    chain
      .isObject()
      .withMessage(`${path} must be an object`)
      .custom((value: unknown) => {
        if (typeof value !== 'object' || value === null) throw new Error(`${path} must be an object`);
        const node = value as Record<string, unknown>;
        if (!['leaf', 'and', 'or', 'not'].includes(node['type'] as string)) {
          throw new Error(`${path}.type must be leaf|and|or|not`);
        }
        return true;
      }),
  ];
};

const channelIdsValidators = (optional: boolean): ValidationChain[] => {
  const chain = optional ? body('channelIds').optional() : body('channelIds');
  return [
    chain.isArray({ min: 1, max: 5 }).withMessage('channelIds must be a non-empty array (max 5)'),
    body('channelIds.*').isInt({ min: 1 }).withMessage('channelIds.* must be a positive integer'),
  ];
};

const channelNameValidators = (optional: boolean): ValidationChain => {
  const chain = optional ? body('name').optional() : body('name');
  return chain
    .isString()
    .withMessage('name must be a string')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 120 })
    .withMessage('name must be at most 120 characters');
};

const channelTypeValidators = (optional: boolean): ValidationChain[] => {
  const chain = optional ? body('type').optional() : body('type');
  return [chain.isString().withMessage('type must be a string').trim().notEmpty().withMessage('type is required')];
};

const channelConfigValidators = (optional: boolean): ValidationChain[] => {
  const chain = optional ? body('config').optional() : body('config');
  return [chain.isObject().withMessage('config must be an object')];
};

function thresholdValidators(optional: boolean): ValidationChain[] {
  return [
    (optional ? body('threshold').optional({ nullable: true }) : body('threshold').optional({ nullable: true }))
      .isObject()
      .withMessage('threshold must be an object')
      .custom((value: unknown) => {
        if (value === null || value === undefined) return true;
        const t = value as Record<string, unknown>;
        const count = t['count'];
        const windowSeconds = t['windowSeconds'];
        if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 1000) {
          throw new Error('threshold.count must be an integer 1..1000');
        }
        if (
          typeof windowSeconds !== 'number' ||
          !Number.isInteger(windowSeconds) ||
          windowSeconds < 10 ||
          windowSeconds > 86400
        ) {
          throw new Error('threshold.windowSeconds must be an integer 10..86400');
        }
        return true;
      }),
  ];
}

export const createNotificationValidators: ValidationChain[] = [
  body('name')
    .isString()
    .withMessage('name must be a string')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 120 })
    .withMessage('name must be at most 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('description must be a string')
    .isLength({ max: 500 })
    .withMessage('description must be at most 500 characters'),
  body('enabled').optional().isBoolean().withMessage('enabled must be a boolean'),
  ...conditionShape('condition', false),
  ...thresholdValidators(false),
  body('message')
    .isString()
    .withMessage('message must be a string')
    .trim()
    .notEmpty()
    .withMessage('message is required')
    .isLength({ max: 2000 })
    .withMessage('message must be at most 2000 characters'),
  ...channelIdsValidators(false),
];

export const updateNotificationValidators: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  body('name')
    .optional()
    .isString()
    .withMessage('name must be a string')
    .trim()
    .notEmpty()
    .withMessage('name cannot be empty')
    .isLength({ max: 120 })
    .withMessage('name must be at most 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('description must be a string')
    .isLength({ max: 500 })
    .withMessage('description must be at most 500 characters'),
  body('enabled').optional().isBoolean().withMessage('enabled must be a boolean'),
  ...conditionShape('condition', true),
  ...thresholdValidators(true),
  body('message')
    .optional()
    .isString()
    .withMessage('message must be a string')
    .trim()
    .notEmpty()
    .withMessage('message cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('message must be at most 2000 characters'),
  ...channelIdsValidators(true),
];

export const notificationIdValidators: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
];

export const toggleNotificationValidators: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  body('enabled').isBoolean().withMessage('enabled must be a boolean'),
];

export const createChannelValidators: ValidationChain[] = [
  channelNameValidators(false),
  ...channelTypeValidators(false),
  ...channelConfigValidators(false),
];

export const updateChannelValidators: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  channelNameValidators(true),
  ...channelTypeValidators(true),
  ...channelConfigValidators(true),
];

export const channelIdValidators: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
];

export const testInlineChannelValidators: ValidationChain[] = [
  body('type').isString().withMessage('type must be a string').trim().notEmpty().withMessage('type is required'),
  body('config').isObject().withMessage('config must be an object'),
  body('message')
    .optional()
    .isString()
    .withMessage('message must be a string')
    .isLength({ max: 2000 })
    .withMessage('message must be at most 2000 characters'),
];

export const testChannelValidators: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  body('message')
    .optional()
    .isString()
    .withMessage('message must be a string')
    .isLength({ max: 2000 })
    .withMessage('message must be at most 2000 characters'),
];
