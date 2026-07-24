import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { makeDecision, makeAlert } from '@/__tests__/factories';

describe('getDecisionByIp', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM decisions');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('returns 200 with decision for IP', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 1, alert_id: 1, value: '1.2.3.4' })],
    });
    const res = await app.request.get('/api/v1/decisions/by-ip/1.2.3.4');
    expect(res.status).toBe(200);
    expect(res.body.ip).toBe('1.2.3.4');
  });

  it('returns 404 for IP with no decisions', async () => {
    const res = await app.request.get('/api/v1/decisions/by-ip/9.9.9.9');
    expect(res.status).toBe(404);
  });
});
