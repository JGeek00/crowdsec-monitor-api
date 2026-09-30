import type {
  EmailChannelConfig,
  NotificationChannelConfig,
  NotificationChannelType,
  NtfyChannelConfig,
} from '@/models';

export const NTFY_DEFAULT_SERVER = 'https://ntfy.sh';
export const EMAIL_DEFAULT_PORT = 587;

const TOPIC_PATTERN = /^[-_A-Za-z0-9]{1,64}$/;
const PRIORITIES = ['1', '2', '3', '4', '5', 'min', 'low', 'default', 'high', 'urgent', 'max'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function validateNtfy(config: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const topic = asString(config['topic']);
  if (!topic || !TOPIC_PATTERN.test(topic)) {
    errors.push('config.topic is required (letters, numbers, _ and -, max 64 chars)');
  }
  const server = config['server'];
  if (server !== undefined) {
    const s = asString(server);
    if (!s || s.length > 2048 || !/^https?:\/\/.+/.test(s)) {
      errors.push('config.server must be a valid http or https URL');
    }
  }
  const username = asString(config['username']);
  const password = asString(config['password']);
  const accessToken = asString(config['accessToken']);
  if (username !== null && username.length > 256) errors.push('config.username must be at most 256 characters');
  if (password !== null && password.length > 1024) errors.push('config.password must be at most 1024 characters');
  if (accessToken !== null && accessToken.length > 1024) {
    errors.push('config.accessToken must be at most 1024 characters');
  }
  if (username !== null && password === null) errors.push('config.password is required when username is set');
  if (accessToken !== null && (username !== null || password !== null)) {
    errors.push('config.accessToken cannot be combined with username/password');
  }
  const priority = config['priority'];
  if (priority !== undefined && !PRIORITIES.includes(String(priority))) {
    errors.push(`config.priority must be one of ${PRIORITIES.join(', ')}`);
  }
  const tags = asString(config['tags']);
  if (tags !== null && (tags.length === 0 || tags.length > 256)) {
    errors.push('config.tags must be 1..256 characters');
  }
  return errors;
}

export function splitRecipients(to: string): string[] {
  return to
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r !== '');
}

function validateEmail(config: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const host = asString(config['host']);
  if (!host || host.length > 253) errors.push('config.host is required (max 253 characters)');
  const port = config['port'];
  if (port !== undefined && (!Number.isInteger(port) || (port as number) < 1 || (port as number) > 65535)) {
    errors.push('config.port must be an integer 1..65535');
  }
  if (config['secure'] !== undefined && typeof config['secure'] !== 'boolean') {
    errors.push('config.secure must be a boolean');
  }
  const username = asString(config['username']);
  const password = asString(config['password']);
  if (username !== null && password === null) errors.push('config.password is required when username is set');
  if (password !== null && username === null) errors.push('config.username is required when password is set');
  const from = asString(config['from']);
  if (!from || !EMAIL_PATTERN.test(from)) errors.push('config.from must be a valid email address');
  const to = asString(config['to']);
  if (!to || to.length > 2000) {
    errors.push('config.to is required (comma-separated email addresses)');
  } else {
    const bad = splitRecipients(to).filter((r) => !EMAIL_PATTERN.test(r));
    if (splitRecipients(to).length === 0 || bad.length > 0) {
      errors.push('config.to must contain valid email addresses');
    }
  }
  return errors;
}

export function validateChannelConfig(type: NotificationChannelType, config: unknown): string[] {
  if (!isRecord(config)) return ['config must be an object'];
  if (type === 'ntfy') return validateNtfy(config);
  if (type === 'email') return validateEmail(config);
  return [`unsupported channel type ${type}`];
}

export function withChannelDefaults(
  type: NotificationChannelType,
  config: NotificationChannelConfig,
): NotificationChannelConfig {
  if (type === 'ntfy') {
    const c = config as NtfyChannelConfig;
    return { server: NTFY_DEFAULT_SERVER, ...c };
  }
  const c = config as EmailChannelConfig;
  return { port: EMAIL_DEFAULT_PORT, secure: false, ...c };
}

export function buildNtfyUrl(server: string, topic: string): string {
  return `${server.replace(/\/+$/, '')}/${topic}`;
}
