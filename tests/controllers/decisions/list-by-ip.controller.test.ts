import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeDecision, makeAlert } from '@tests/factories';

describe('listDecisionsByIp', () => {
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

  it('returns 200 with empty groups on empty DB', async () => {
    const res = await app.request.get('/api/v1/decisions/by-ip');
    expect(res.status).toBe(200);
    expect(res.body.groups).toEqual([]);
  });

  it('returns grouped decisions by IP', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1, value: '1.2.3.4' })] });
    const res = await app.request.get('/api/v1/decisions/by-ip');
    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.groups[0].ip).toBe('1.2.3.4');
  });

  it('returns groups with only active decisions when only_active=true', async () => {
    await app.seedDb({
      alerts: [makeAlert()],
      decisions: [makeDecision({ id: 1, alert_id: 1, value: '1.2.3.4', expiration: new Date(Date.now() - 10000) })],
    });
    const res = await app.request.get('/api/v1/decisions/by-ip?only_active=true');
    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(0);
  });

  it('returns decision details when include_decisions=true', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 1, alert_id: 1, value: '1.2.3.4' })],
    });
    const res = await app.request.get('/api/v1/decisions/by-ip?include_decisions=true');
    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.groups[0].decisions).toBeDefined();
  });
});
