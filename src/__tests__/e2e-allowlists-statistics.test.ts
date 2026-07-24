import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';

describe('e2e allowlists and statistics', () => {
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

  it('GET /api/v1/allowlists returns data array', async () => {
    const res = await app.request.get('/api/v1/allowlists');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('length');
  });

  it('POST /api/v1/allowlists/check returns 400 with empty body', async () => {
    const res = await app.request.post('/api/v1/allowlists/check').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/allowlists/check returns results for IPs', async () => {
    const res = await app.request.post('/api/v1/allowlists/check').send({ ips: ['192.168.1.1'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
  });

  it('GET /api/v1/statistics returns 200 with expected shape', async () => {
    const res = await app.request.get('/api/v1/statistics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('alertsLast24Hours');
  });

  it('GET /api/v1/statistics/countries returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics/countries');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/v1/statistics/scenarios returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics/scenarios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/v1/statistics/targets returns 200', async () => {
    const res = await app.request.get('/api/v1/statistics/targets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
