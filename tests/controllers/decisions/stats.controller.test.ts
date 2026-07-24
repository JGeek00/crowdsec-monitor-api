import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeDecision, makeAlert } from '@tests/factories';

describe('getDecisionStats', () => {
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

  it('returns 200 with zero counts on empty DB', async () => {
    const res = await app.request.get('/api/v1/decisions/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('returns stats grouped by type and scope', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1, type: 'ban', scope: 'Ip' })] });
    const res = await app.request.get('/api/v1/decisions/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.byType).toBeDefined();
    expect(res.body.byScope).toBeDefined();
  });
});
