import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { makeAlert } from '@/__tests__/factories';

describe('getAllAlerts', () => {
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

  it('returns 200 with empty items on empty DB', async () => {
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns seeded alerts', async () => {
    await app.seedDb({ alerts: [makeAlert({ scenario: 'crowdsec/ssh-bf' })] });
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].scenario).toBe('crowdsec/ssh-bf');
  });

  it('returns pagination shape', async () => {
    const alerts = Array.from({ length: 5 }, (_, i) => makeAlert({ id: i + 1 }));
    await app.seedDb({ alerts });
    const res = await app.request.get('/api/v1/alerts?limit=2&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.pagination.amount).toBe(2);
  });

  it('returns 400 when offset exceeds total', async () => {
    const res = await app.request.get('/api/v1/alerts?offset=10');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('filters by scenario', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1, scenario: 'crowdsec/ssh-bf' }), makeAlert({ id: 2, scenario: 'crowdsec/http-bf' })],
    });
    const res = await app.request.get('/api/v1/alerts?scenario=ssh-bf');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('filters by simulated flag', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1, simulated: false }), makeAlert({ id: 2, simulated: true })],
    });
    const res = await app.request.get('/api/v1/alerts?simulated=true');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns filtering options', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.filtering).toBeDefined();
    expect(Array.isArray(res.body.filtering.countries)).toBe(true);
    expect(Array.isArray(res.body.filtering.scenarios)).toBe(true);
  });

  it('returns unpaged response with total when unpaged=true', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/alerts?unpaged=true');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeUndefined();
    expect(res.body.total).toBe(1);
  });
});
