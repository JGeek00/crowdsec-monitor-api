import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert, makeDecision } from '@tests/factories';

describe('getAlertById', () => {
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

  it('returns 200 and alert when found', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 1 })] });
    const res = await app.request.get('/api/v1/alerts/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('returns 404 when alert is not found', async () => {
    const res = await app.request.get('/api/v1/alerts/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('includes associated decisions', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 1, alert_id: 1 })],
    });
    const res = await app.request.get('/api/v1/alerts/1');
    expect(res.status).toBe(200);
    expect(res.body.decisions).toBeDefined();
    expect(res.body.decisions).toHaveLength(1);
  });
});
