import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeDecision, makeAlert } from '@tests/factories';

describe('getAllDecisions', () => {
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

  it('returns 200 with empty items on empty DB', async () => {
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns seeded decisions', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns pagination shape', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const decisions = Array.from({ length: 3 }, (_, i) => makeDecision({ id: i + 1, alert_id: 1 }));
    await app.seedDb({ decisions });
    const res = await app.request.get('/api/v1/decisions?limit=1&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.amount).toBe(1);
  });

  it('filters by type', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    await app.seedDb({
      decisions: [
        makeDecision({ id: 1, alert_id: 1, type: 'ban' }),
        makeDecision({ id: 2, alert_id: 1, type: 'captcha' }),
      ],
    });
    const res = await app.request.get('/api/v1/decisions?type=ban');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns filtering options', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
    expect(res.body.filtering).toBeDefined();
  });

  it('returns 400 when offset exceeds total', async () => {
    const res = await app.request.get('/api/v1/decisions?offset=10');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('returns total when unpaged=true', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions?unpaged=true');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.pagination).toBeUndefined();
  });
});
