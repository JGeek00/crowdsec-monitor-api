import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { makeDecision, makeAlert } from '@/__tests__/factories';

describe('getDecisionById', () => {
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

  it('returns 200 and decision when found', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ id: 1, alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('returns 404 when decision is not found', async () => {
    const res = await app.request.get('/api/v1/decisions/999');
    expect(res.status).toBe(404);
  });
});
