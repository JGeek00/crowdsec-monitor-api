import { describe, expect, it } from 'vitest';
import { notificationProviders } from '@/constants/notification-providers';
import {
  buildNtfyUrl,
  isSecretKey,
  sanitizeChannelConfig,
  sanitizeProviderDefinitions,
  splitRecipients,
  validateChannelConfig,
  withChannelDefaults,
} from '@/shared/utils/notification-channel';

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
    expect(validateChannelConfig('email', { host: 'h', from: 'a@b.c', to: 'd@e.f', nope: 1 }).length).toBeGreaterThan(
      0,
    );
  });
});

describe('validateChannelConfig email', () => {
  const valid = { host: 'smtp.example.com', from: 'a@example.com', to: 'b@example.com, c@example.com' };

  it('accepts a minimal config', () => {
    expect(validateChannelConfig('email', valid)).toEqual([]);
  });

  it('accepts a full authenticated config', () => {
    expect(validateChannelConfig('email', { ...valid, port: 465, secure: true, username: 'u', password: 'p' })).toEqual(
      [],
    );
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
    expect(sanitizeChannelConfig('email', { host: 'h', password: 'p' } as never)).toEqual({ host: 'h' });
  });

  it('returns empty for unknown types or non-objects', () => {
    expect(sanitizeChannelConfig('sms', { a: 1 } as never)).toEqual({});
    expect(sanitizeChannelConfig('ntfy', null as never)).toEqual({});
  });
});

describe('sanitizeProviderDefinitions', () => {
  it('strips defaults from secret fields and keeps the rest intact', () => {
    const sanitized = sanitizeProviderDefinitions([
      {
        type: 'acme',
        icon: 'acme',
        labelKey: 'provider_acme',
        supportsTest: false,
        supportsAlertInfo: false,
        sections: [{ key: 'auth', labelKey: 'section_auth' }],
        fields: [
          {
            key: 'password',
            labelKey: 'field_password',
            type: 'password',
            secret: true,
            default: 'leaked-secret',
          },
          { key: 'host', labelKey: 'field_host', type: 'text', required: true },
        ],
      },
    ]);
    expect(sanitized[0]?.fields[0]).toEqual({
      key: 'password',
      labelKey: 'field_password',
      type: 'password',
      secret: true,
    });
    expect(sanitized[0]?.fields[1]).toEqual({
      key: 'host',
      labelKey: 'field_host',
      type: 'text',
      required: true,
    });
  });

  it('keeps non-secret defaults', () => {
    const sanitized = sanitizeProviderDefinitions(notificationProviders);
    const ntfy = sanitized.find((p) => p.type === 'ntfy');
    expect(ntfy?.fields.find((f) => f.key === 'server')?.default).toBe('https://ntfy.sh');
    for (const provider of sanitized) {
      for (const field of provider.fields) {
        if (field.secret === true) expect(field.default).toBeUndefined();
      }
    }
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


describe('validator branches on real providers', () => {
  const emailBase = { host: 'h', from: 'a@b.c', to: 'd@e.f' };

  it('validates email format, list recipients and maxLength bounds', () => {
    expect(validateChannelConfig('email', { ...emailBase, from: 'nope' })).toContainEqual(
      'config.from must contain valid email addresses',
    );
    expect(validateChannelConfig('email', { ...emailBase, to: 'd@e.f, bad' })).toContainEqual(
      'config.to must contain valid email addresses',
    );
    expect(validateChannelConfig('email', { ...emailBase, host: 'x'.repeat(254) })).toContainEqual(
      'config.host must be at most 253 characters',
    );
    expect(validateChannelConfig('email', { ...emailBase, username: 'x'.repeat(1025) })).toContainEqual(
      'config.username must be at most 1024 characters',
    );
  });

  it('validates the port as an integer within bounds', () => {
    expect(validateChannelConfig('email', { ...emailBase, port: 'x' })).toContainEqual('config.port must be a number');
    expect(validateChannelConfig('email', { ...emailBase, port: 1.5 })).toContainEqual('config.port must be an integer');
    expect(validateChannelConfig('email', { ...emailBase, port: 0 })).toContainEqual('config.port must be at least 1');
    expect(validateChannelConfig('email', { ...emailBase, port: 70000 })).toContainEqual(
      'config.port must be at most 65535',
    );
    expect(validateChannelConfig('email', { ...emailBase, port: 587 })).toEqual([]);
  });

  it('validates boolean and select fields', () => {
    expect(validateChannelConfig('email', { ...emailBase, secure: 'yes' })).toContainEqual(
      'config.secure must be a boolean',
    );
    expect(validateChannelConfig('email', { ...emailBase, secure: true })).toEqual([]);
    expect(validateChannelConfig('ntfy', { topic: 't', priority: 'nope' })).toContainEqual(
      'config.priority must be one of min, low, default, high, urgent, max',
    );
    expect(validateChannelConfig('ntfy', { topic: 't', priority: 'high' })).toEqual([]);
  });

  it('isSecretKey answers per provider type and unknown types', () => {
    expect(isSecretKey('email', 'password')).toBe(true);
    expect(isSecretKey('email', 'host')).toBe(false);
    expect(isSecretKey('nope-type', 'password')).toBe(false);
  });
});

describe('isPresent branches through withChannelDefaults', () => {
  it('defaults fill only completely absent keys; present values pass through as-is', () => {
    expect(withChannelDefaults('email', { host: 'h', from: 'a@b.c', to: 'd@e.f' })['port']).toBe(587);
    // absent-shaped values still count as present keys for the final spread
    for (const port of [null, undefined, '', '   ', []]) {
      expect(withChannelDefaults('email', { host: 'h', from: 'a@b.c', to: 'd@e.f', port } as never)['port']).toBe(port);
    }
  });

  it('keeps present values of any type (numbers, non-empty arrays)', () => {
    expect(withChannelDefaults('email', { host: 'h', from: 'a@b.c', to: 'd@e.f', port: 6000 } as never)['port']).toBe(6000);
    expect(withChannelDefaults('email', { host: 'h', from: 'a@b.c', to: 'd@e.f', port: [1] } as never)['port']).toEqual([1]);
  });

  it('rejects non-string select values', () => {
    expect(validateChannelConfig('ntfy', { topic: 't', priority: 5 })).toContainEqual(
      'config.priority must be one of min, low, default, high, urgent, max',
    );
  });
});
