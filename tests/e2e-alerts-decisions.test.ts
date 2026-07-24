import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert, makeDecision } from '@tests/factories';

describe('e2e alerts and decisions', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM decisions');
    await app.sequelize.query('DELETE FROM alerts');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/alerts returns paginated response', async () => {
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body).toHaveProperty('filtering');
  });

  it('GET /api/v1/alerts contains seeded alerts in items', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 1 })] });
    const res = await app.request.get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/decisions returns paginated response', async () => {
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('pagination');
  });

  it('GET /api/v1/decisions/by-ip/:ip returns decision for known IP', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 1, alert_id: 1, value: '1.2.3.4' })],
    });
    const res = await app.request.get('/api/v1/decisions/by-ip/1.2.3.4');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ip', '1.2.3.4');
  });

  it('GET /api/v1/decisions/by-ip/:ip returns 404 for unknown IP', async () => {
    const res = await app.request.get('/api/v1/decisions/by-ip/9.9.9.9');
    expect(res.status).toBe(404);
  });

  it('cross-entity: alert source and decision value match', async () => {
    const alertSource = { ...makeAlert().source, ip: '5.6.7.8', value: '5.6.7.8' };
    const decisionSource = { ...makeDecision().source, ip: '5.6.7.8' };
    await app.seedDb({
      alerts: [makeAlert({ id: 1, source: alertSource })],
      decisions: [makeDecision({ id: 1, alert_id: 1, value: '5.6.7.8', source: decisionSource })],
    });
    const alertRes = await app.request.get('/api/v1/alerts/1');
    expect(alertRes.status).toBe(200);
    expect(alertRes.body.source.ip).toBe('5.6.7.8');

    const decRes = await app.request.get('/api/v1/decisions/by-ip/5.6.7.8');
    expect(decRes.status).toBe(200);
    expect(decRes.body).toHaveProperty('ip', '5.6.7.8');
  });
});
