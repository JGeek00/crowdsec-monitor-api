import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { makeAlert, makeDecision } from '@/__tests__/factories';

describe('alert routes', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM alerts');
    await app.sequelize.query('DELETE FROM decisions');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/alerts returns 200', async () => {
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/alerts/:id returns 200 for existing alert', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 1 })] });
    const res = await app.request.get('/api/v1/alerts/1');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/alerts/:id returns 404 for missing alert', async () => {
    const res = await app.request.get('/api/v1/alerts/999');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/alerts/stats returns 200', async () => {
    const res = await app.request.get('/api/v1/alerts/stats');
    expect(res.status).toBe(200);
  });

  it('DELETE /api/v1/alerts/:id returns 404 for missing alert', async () => {
    const res = await app.request.delete('/api/v1/alerts/999');
    expect(res.status).toBe(404);
  });
});
