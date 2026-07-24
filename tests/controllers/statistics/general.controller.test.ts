import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert, makeDecision } from '@tests/factories';

describe('getStatistics', () => {
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

  it('returns 200 with empty stats on empty DB', async () => {
    const res = await app.request.get('/api/v1/statistics');
    expect(res.status).toBe(200);
    expect(res.body.alertsLast24Hours).toBe(0);
    expect(res.body.activeDecisions).toBe(0);
  });

  it('returns stats with seeded data', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 1 })],
    });
    const res = await app.request.get('/api/v1/statistics');
    expect(res.status).toBe(200);
    expect(res.body.topCountries).toBeDefined();
    expect(res.body.topScenarios).toBeDefined();
    expect(res.body.topIpOwners).toBeDefined();
    expect(res.body.topTargets).toBeDefined();
  });
});
