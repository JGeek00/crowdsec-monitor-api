import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';

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
});
