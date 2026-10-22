import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';

describe('createApp', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('returns an Express app with helmet, cors, json, routes mounted', async () => {
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
  });

  it('root / returns 404', async () => {
    const res = await app.request.get('/');
    expect(res.status).toBe(404);
  });

  it('unknown route returns 404', async () => {
    const res = await app.request.get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Not found');
  });

  it('keeps logging /api/v1 requests (previous morgan behavior)', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      await app.request.get('/api/v1/alerts');
      expect(writeSpy.mock.calls.join('')).toContain('GET /api/v1/alerts');
    } finally {
      writeSpy.mockRestore();
    }
  });

  it('skips morgan logging for /mcp requests', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const res = await app.request
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
      expect([200, 400, 202]).toContain(res.status);
      expect(writeSpy.mock.calls.join('')).not.toContain('POST /mcp');
    } finally {
      writeSpy.mockRestore();
    }
  });
});
