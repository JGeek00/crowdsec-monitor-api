import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';

describe('AuthMiddleware integration', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('allows requests when no API password is set', async () => {
    const res = await app.request.get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});

describe('AuthMiddleware.checkAuth', () => {
  it('returns valid when no API password is set', async () => {
    vi.resetModules();
    process.env.API_PASSWORD = '';
    const { AuthMiddleware } = await import('@/middlewares/auth.middleware');
    const result = (AuthMiddleware as any)['checkAuth'](undefined);
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for wrong token', async () => {
    vi.resetModules();
    process.env.API_PASSWORD = 'test-secret';
    const { AuthMiddleware } = await import('@/middlewares/auth.middleware');
    const result = (AuthMiddleware as any)['checkAuth']('Bearer wrong-secret');
    expect(result.isValid).toBe(false);
  });

  it('returns invalid when auth header is missing', async () => {
    vi.resetModules();
    process.env.API_PASSWORD = 'test-secret';
    const { AuthMiddleware } = await import('@/middlewares/auth.middleware');
    const result = (AuthMiddleware as any)['checkAuth'](undefined);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Authorization header is required');
  });

  it('returns invalid for wrong auth format', async () => {
    vi.resetModules();
    process.env.API_PASSWORD = 'test-secret';
    const { AuthMiddleware } = await import('@/middlewares/auth.middleware');
    const result = (AuthMiddleware as any)['checkAuth']('Basic dGVzdA==');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Bearer');
  });

  it('returns invalid for token with different length', async () => {
    vi.resetModules();
    process.env.API_PASSWORD = 'test-secret';
    const { AuthMiddleware } = await import('@/middlewares/auth.middleware');
    const result = (AuthMiddleware as any)['checkAuth']('Bearer short');
    expect(result.isValid).toBe(false);
  });

  it('returns valid for correct token', async () => {
    vi.resetModules();
    process.env.API_PASSWORD = 'test-secret';
    const { AuthMiddleware } = await import('@/middlewares/auth.middleware');
    const result = (AuthMiddleware as any)['checkAuth']('Bearer test-secret');
    expect(result.isValid).toBe(true);
  });

  it('wsAuth passes when no password set', async () => {
    vi.resetModules();
    process.env.API_PASSWORD = '';
    const { AuthMiddleware } = await import('@/middlewares/auth.middleware');
    const socket = { write: vi.fn(), destroy: vi.fn() } as any;
    AuthMiddleware.wsAuth({ headers: {} } as any, socket, Buffer.from(''));
    expect(socket.write).not.toHaveBeenCalled();
  });

  it('wsAuth rejects when auth header missing and password set', async () => {
    vi.resetModules();
    process.env.API_PASSWORD = 'test-secret';
    const { AuthMiddleware } = await import('@/middlewares/auth.middleware');
    const socket = { write: vi.fn(), destroy: vi.fn() } as any;
    AuthMiddleware.wsAuth({ headers: {} } as any, socket, Buffer.from(''));
    expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    expect(socket.destroy).toHaveBeenCalled();
  });
});
