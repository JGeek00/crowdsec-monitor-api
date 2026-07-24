import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert } from '@tests/factories';

describe('statistics routes', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM alerts');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/statistics returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/statistics/countries returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics/countries');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/statistics/scenarios returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics/scenarios');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/statistics/ip-owners returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics/ip-owners');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/statistics/targets returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics/targets');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/statistics/countries/US returns 200', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/statistics/countries/US');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/statistics/scenarios/test returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics/scenarios/test');
    expect(res.status).toBe(200);
  });
});
