import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeDecision, makeAlert } from '@tests/factories';

const CANONICAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

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

  it('returns every timestamp field in canonical format (decision and embedded alert)', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 9 })], decisions: [makeDecision({ id: 9, alert_id: 9 })] });
    const res = await app.request.get('/api/v1/decisions/9');
    expect(res.status).toBe(200);
    expect(res.body.expiration).toMatch(CANONICAL_PATTERN);
    expect(res.body.crowdsec_created_at).toMatch(CANONICAL_PATTERN);
    expect(res.body.alert).toBeDefined();
    expect(res.body.alert.crowdsec_created_at).toMatch(CANONICAL_PATTERN);
    expect(res.body.alert.events[0].timestamp).toMatch(CANONICAL_PATTERN);
  });
});
