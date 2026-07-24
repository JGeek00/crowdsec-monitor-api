import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';

describe('allowlist routes', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/allowlists returns 200', async () => {
    const res = await app.request.get('/api/v1/allowlists');
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/allowlists/check returns 400 without body', async () => {
    const res = await app.request.post('/api/v1/allowlists/check').send({});
    expect(res.status).toBe(400);
  });
});
