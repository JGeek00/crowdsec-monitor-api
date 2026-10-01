import type { NotificationChannelConfig } from '@/models';
import {
  findProvider,
  type ProviderDefinition,
  type ProviderFieldCondition,
  type ProviderFieldDefinition,
} from '@/constants/notification-providers';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function conditionHolds(condition: ProviderFieldCondition, config: Record<string, unknown>): boolean {
  const value = config[condition.field];
  if (condition.present !== undefined) {
    return condition.present ? isPresent(value) : !isPresent(value);
  }
  if (condition.equals !== undefined) {
    return value === condition.equals;
  }
  return false;
}

export function splitRecipients(to: string): string[] {
  return to
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r !== '');
}

function checkString(
  key: string,
  value: unknown,
  field: ProviderFieldDefinition,
  errors: string[],
  format?: (item: string) => boolean,
  formatMessage?: string,
): void {
  if (typeof value !== 'string') {
    errors.push(`config.${key} must be a string`);
    return;
  }
  if (field.minLength !== undefined && value.length < field.minLength) {
    errors.push(`config.${key} must be at least ${String(field.minLength)} characters`);
  }
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    errors.push(`config.${key} must be at most ${String(field.maxLength)} characters`);
  }
  if (field.regex !== undefined && !new RegExp(field.regex).test(value)) {
    errors.push(`config.${key} has an invalid format`);
  }
  if (format) {
    const items = field.list === true ? splitRecipients(value) : [value];
    if (items.length === 0 || items.some((item) => !format(item))) {
      errors.push(formatMessage ?? `config.${key} has an invalid format`);
    }
  }
}

function checkField(
  key: string,
  value: unknown,
  field: ProviderFieldDefinition,
  config: Record<string, unknown>,
  errors: string[],
): void {
  const required =
    field.required === true || (field.requiredIf !== undefined && conditionHolds(field.requiredIf, config));
  if (!isPresent(value)) {
    if (required) errors.push(`config.${key} is required`);
    return;
  }
  switch (field.type) {
    case 'text':
    case 'password':
      checkString(key, value, field, errors);
      break;
    case 'email':
      checkString(
        key,
        value,
        field,
        errors,
        (item) => EMAIL_PATTERN.test(item),
        `config.${key} must contain valid email addresses`,
      );
      break;
    case 'url':
      checkString(
        key,
        value,
        field,
        errors,
        (item) => /^https?:\/\/.+/.test(item),
        `config.${key} must be a valid http or https URL`,
      );
      break;
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`config.${key} must be a number`);
        return;
      }
      if (field.integer === true && !Number.isInteger(value)) {
        errors.push(`config.${key} must be an integer`);
      }
      if (field.min !== undefined && value < field.min)
        errors.push(`config.${key} must be at least ${String(field.min)}`);
      if (field.max !== undefined && value > field.max)
        errors.push(`config.${key} must be at most ${String(field.max)}`);
      break;
    }
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(`config.${key} must be a boolean`);
      break;
    case 'select': {
      const allowed = (field.options ?? []).map((o) => o.value);
      if (typeof value !== 'string' || !allowed.includes(value)) {
        errors.push(`config.${key} must be one of ${allowed.join(', ')}`);
      }
      break;
    }
  }
  if (field.exclusiveWith !== undefined) {
    const clash = field.exclusiveWith.find((other) => isPresent(config[other]));
    if (clash !== undefined) {
      errors.push(`config.${key} cannot be combined with ${clash}`);
    }
  }
}

export function validateChannelConfig(type: string, config: unknown): string[] {
  const provider = findProvider(type);
  if (!provider) return [`unknown channel type ${type}`];
  if (!isRecord(config)) return ['config must be an object'];
  const errors: string[] = [];
  const known = new Set(provider.fields.map((f) => f.key));
  for (const key of Object.keys(config)) {
    if (!known.has(key)) errors.push(`config.${key} is not a valid field for ${type}`);
  }
  for (const field of provider.fields) {
    checkField(field.key, config[field.key], field, config, errors);
  }
  return errors;
}

export function withChannelDefaults(type: string, config: NotificationChannelConfig): NotificationChannelConfig {
  const provider = findProvider(type);
  const source = (isRecord(config) ? config : {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = {};
  if (provider) {
    for (const field of provider.fields) {
      if (field.default !== undefined && !isPresent(source[field.key])) {
        merged[field.key] = field.default;
      }
    }
  }
  return { ...merged, ...source } as unknown as NotificationChannelConfig;
}

/** Remove secret fields so read endpoints never leak them. */
export function sanitizeChannelConfig(type: string, config: unknown): Record<string, unknown> {
  const provider = findProvider(type);
  if (!provider || !isRecord(config)) return {};
  const secrets = new Set(provider.fields.filter((f) => f.secret === true).map((f) => f.key));
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (!secrets.has(key)) clean[key] = value;
  }
  return clean;
}

export function buildNtfyUrl(server: string, topic: string): string {
  return `${server.replace(/\/+$/, '')}/${topic}`;
}

/** True when the key is flagged secret for the provider type. */
export function isSecretKey(type: string, key: string): boolean {
  const provider = findProvider(type);
  return provider?.fields.some((f) => f.key === key && f.secret === true) ?? false;
}

/**
 * Provider definitions are served publicly, so secret fields must never carry
 * literal values: `default` is the only definition field that can embed one.
 */
export function sanitizeProviderDefinitions(providers: ProviderDefinition[]): ProviderDefinition[] {
  return providers.map((provider) => ({
    ...provider,
    fields: provider.fields.map((field) => {
      if (field.secret !== true || field.default === undefined) return field;
      const { default: _removed, ...rest } = field;
      return rest;
    }),
  }));
}
