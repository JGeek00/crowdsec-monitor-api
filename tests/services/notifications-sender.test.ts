import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

const sendMailMock = vi.fn();
const createTransportMock = vi.fn();

vi.mock('nodemailer', () => ({
  default: { createTransport: (...args: unknown[]) => createTransportMock(...args) },
}));

import {
  dispatchChannels,
  registerNotificationChannel,
  supportedNotificationChannels,
} from '@/services/notifications/notification-sender.service';

beforeEach(() => {
  sendMailMock.mockReset().mockResolvedValue({ messageId: 'test-id' });
  createTransportMock.mockReset().mockReturnValue({ sendMail: sendMailMock });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('notification-sender', () => {
  it('exposes registered channels', () => {
    expect(supportedNotificationChannels()).toContain('ntfy');
    expect(supportedNotificationChannels()).toContain('email');
  });

  it('rejects email without host, from or recipient', async () => {
    const results = await dispatchChannels([{ type: 'email', config: {} }], 'msg', 'title');
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.detail).toContain('missing');
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('sends email through nodemailer with defaults and auth', async () => {
    const results = await dispatchChannels(
      [
        {
          type: 'email',
          config: {
            host: 'smtp.example.com',
            from: 'from@example.com',
            to: 'a@example.com, b@example.com',
            username: 'user',
            password: 'pass',
          },
        },
      ],
      'hello',
      'subject title',
    );
    expect(results[0]?.ok).toBe(true);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' },
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'from@example.com',
      to: 'a@example.com, b@example.com',
      subject: 'subject title',
      text: 'hello',
    });
  });

  it('sends email without auth when no credentials', async () => {
    const results = await dispatchChannels(
      [{ type: 'email', config: { host: 'relay.local', from: 'a@b.c', to: 'd@e.f' } }],
      'm',
      't',
    );
    expect(results[0]?.ok).toBe(true);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'relay.local',
      port: 587,
      secure: false,
      auth: undefined,
    });
  });

  it('reports email send failures', async () => {
    sendMailMock.mockRejectedValue(new Error('connection refused'));
    const results = await dispatchChannels(
      [{ type: 'email', config: { host: 'relay.local', from: 'a@b.c', to: 'd@e.f' } }],
      'm',
      't',
    );
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.detail).toContain('connection refused');
  });

  it('rejects ntfy without topic', async () => {
    const results = await dispatchChannels([{ type: 'ntfy', config: {} }], 'msg', 'title');
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.detail).toContain('topic');
  });

  it('sends ntfy to the default server with title header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const results = await dispatchChannels([{ type: 'ntfy', config: { topic: 'my-topic' } }], 'hello', 'title');
    expect(results[0]?.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://ntfy.sh/my-topic');
    expect(init.headers['Title']).toBe('title');
  });

  it('sends ntfy with bearer token, priority and tags', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await dispatchChannels(
      [
        {
          type: 'ntfy',
          config: {
            server: 'https://ntfy.example.com/',
            topic: 'alerts',
            accessToken: 'tk_123',
            priority: 'high',
            tags: 'warning',
          },
        },
      ],
      'hello',
      'title',
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://ntfy.example.com/alerts');
    expect(init.headers['Authorization']).toBe('Bearer tk_123');
    expect(init.headers['Priority']).toBe('high');
    expect(init.headers['Tags']).toBe('warning');
  });

  it('sends ntfy with basic auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await dispatchChannels(
      [{ type: 'ntfy', config: { topic: 't', username: 'u', password: 'p' } }],
      'hello',
      'title',
    );
    const [, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers['Authorization']).toBe(`Basic ${Buffer.from('u:p').toString('base64')}`);
  });

  it('reports ntfy http errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const results = await dispatchChannels([{ type: 'ntfy', config: { topic: 't' } }], 'hello', 'title');
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.detail).toContain('500');
  });

  it('reports unsupported channels', async () => {
    const results = await dispatchChannels([{ type: 'sms' as never, config: {} }], 'msg', 'title');
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.detail).toContain('unsupported');
  });

  it('supports custom registry entries and captures sender throws', async () => {
    registerNotificationChannel('custom-test', async () => null);
    expect(supportedNotificationChannels()).toContain('custom-test');
    const custom = await dispatchChannels([{ type: 'custom-test', config: {} }], 'm', 't');
    expect(custom[0]?.ok).toBe(true);

    registerNotificationChannel('custom-boom', async () => {
      throw new Error('boom');
    });
    const boom = await dispatchChannels([{ type: 'custom-boom', config: {} }], 'm', 't');
    expect(boom[0]?.ok).toBe(false);
    expect(boom[0]?.detail).toContain('boom');
  });
});
