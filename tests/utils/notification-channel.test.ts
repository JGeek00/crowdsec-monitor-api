import { describe, expect, it } from 'vitest';
import {
  buildNtfyUrl,
  sanitizeChannelConfig,
  splitRecipients,
  validateChannelConfig,
  withChannelDefaults,
} from '@/utils/notification-channel';

describe('validateChannelConfig ntfy', () => {
  it('accepts a minimal topic-only config', () => {
    expect(validateChannelConfig('ntfy', { topic: 'my-alerts_01' })).toEqual([]);
  });

  it('accepts a full config', () => {
    expect(
      validateChannelConfig('ntfy', {
        server: 'https://ntfy.example.com',
        topic: 'alerts',
        username: 'user',
        password: 'pass',
        priority: 'high',
        tags: 'warning,skull',
      }),
    ).toEqual([]);
  });

  it('rejects bad topics', () => {
    expect(validateChannelConfig('ntfy', {})).not.toEqual([]);
    expect(validateChannelConfig('ntfy', { topic: 'with spaces' }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('ntfy', { topic: 'a'.repeat(65) }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('ntfy', { topic: 'with/slash' }).length).toBeGreaterThan(0);
  });

  it('rejects bad server, priority and tags', () => {
    expect(validateChannelConfig('ntfy', { topic: 'ok', server: 'ftp://x' }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('ntfy', { topic: 'ok', priority: 'extreme' }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('ntfy', { topic: 'ok', tags: 'x'.repeat(257) }).length).toBeGreaterThan(0);
  });

  it('rejects username without password and token mixed with basic', () => {
    expect(validateChannelConfig('ntfy', { topic: 'ok', username: 'u' }).length).toBeGreaterThan(0);
    expect(
      validateChannelConfig('ntfy', { topic: 'ok', username: 'u', password: 'p', accessToken: 't' }).length,
    ).toBeGreaterThan(0);
    expect(validateChannelConfig('ntfy', { topic: 'ok', accessToken: 'tk_123' })).toEqual([]);
  });

  it('rejects non-objects and unknown types', () => {
    expect(validateChannelConfig('ntfy', null).length).toBeGreaterThan(0);
    expect(validateChannelConfig('sms', {}).length).toBeGreaterThan(0);
  });

  it('treats empty strings as absent and rejects unknown keys', () => {
    expect(validateChannelConfig('ntfy', { topic: 'ok', tags: '' })).toEqual([]);
    expect(validateChannelConfig('ntfy', { topic: 'ok', nope: 1 }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('email', { host: 'h', from: 'a@b.c', to: 'd@e.f', nope: 1 }).length).toBeGreaterThan(0);
  });
});

describe('validateChannelConfig email', () => {
  const valid = { host: 'smtp.example.com', from: 'a@example.com', to: 'b@example.com, c@example.com' };

  it('accepts a minimal config', () => {
    expect(validateChannelConfig('email', valid)).toEqual([]);
  });

  it('accepts a full authenticated config', () => {
    expect(
      validateChannelConfig('email', { ...valid, port: 465, secure: true, username: 'u', password: 'p' }),
    ).toEqual([]);
  });

  it('rejects missing host, bad emails and bad port', () => {
    expect(validateChannelConfig('email', { ...valid, host: '' }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('email', { ...valid, from: 'not-an-email' }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('email', { ...valid, to: 'nope' }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('email', { ...valid, to: '' }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('email', { ...valid, port: 99999 }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('email', { ...valid, port: 1.5 }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('email', { ...valid, secure: 'yes' }).length).toBeGreaterThan(0);
  });

  it('requires username and password together', () => {
    expect(validateChannelConfig('email', { ...valid, username: 'u' }).length).toBeGreaterThan(0);
    expect(validateChannelConfig('email', { ...valid, password: 'p' }).length).toBeGreaterThan(0);
  });
});

describe('sanitizeChannelConfig', () => {
  it('removes secret fields', () => {
    expect(sanitizeChannelConfig('ntfy', { topic: 't', username: 'u', password: 'p' })).toEqual({
      topic: 't',
      username: 'u',
    });
    expect(sanitizeChannelConfig('email', { host: 'h', password: 'p' })).toEqual({ host: 'h' });
  });

  it('returns empty for unknown types or non-objects', () => {
    expect(sanitizeChannelConfig('sms', { a: 1 })).toEqual({});
    expect(sanitizeChannelConfig('ntfy', null)).toEqual({});
  });
});

describe('channel helpers', () => {
  it('applies defaults', () => {
    expect(withChannelDefaults('ntfy', { topic: 't' })).toMatchObject({ server: 'https://ntfy.sh', topic: 't' });
    expect(withChannelDefaults('email', { host: 'h', from: 'a@b.c', to: 'd@e.f' })).toMatchObject({
      port: 587,
      secure: false,
    });
  });

  it('builds ntfy urls without double slashes', () => {
    expect(buildNtfyUrl('https://ntfy.sh/', 'topic')).toBe('https://ntfy.sh/topic');
    expect(buildNtfyUrl('https://ntfy.sh', 'topic')).toBe('https://ntfy.sh/topic');
  });

  it('splits recipients', () => {
    expect(splitRecipients('a@b.c, d@e.f ,,')).toEqual(['a@b.c', 'd@e.f']);
  });
});
