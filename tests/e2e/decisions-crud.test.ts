import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, getLapiClientMock, type TestApp } from '@tests/setup/setup-app';
import { makeAlert, makeDecision } from '@tests/setup/factories';

describe('e2e decisions CRUD and stats', () => {
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

  it('POST /api/v1/decisions creates a decision through the LAPI mock', async () => {
    const lapi = getLapiClientMock();
    lapi.client.post.mockResolvedValueOnce({ data: ['42'] });

    const res = await app.request.post('/api/v1/decisions').send({
      ip: '203.0.113.10',
      duration: '4h',
      reason: 'manual ban',
      type: 'ban',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Decision created successfully');
    expect(res.body.alert_ids).toEqual(['42']);
    expect(res.body.decision).toEqual({
      ip: '203.0.113.10',
      type: 'ban',
      duration: '4h',
      reason: 'manual ban',
    });
  });

  it('DELETE /api/v1/decisions/:id deletes through LAPI and expires locally', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 7, alert_id: 1 })],
    });
    const lapi = getLapiClientMock();
    lapi.client.delete.mockResolvedValueOnce({ data: { nbDeleted: '1' } });

    const res = await app.request.delete('/api/v1/decisions/7');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('DecisionsTable deleted successfully');
    expect(res.body.nbDeleted).toBe('1');
  });

  it('DELETE /api/v1/decisions/:id returns 404 when LAPI reports nothing deleted', async () => {
    const res = await app.request.delete('/api/v1/decisions/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('DecisionsTable not found');
  });

  it('DELETE /api/v1/decisions/:id returns 400 for an invalid ID', async () => {
    const res = await app.request.delete('/api/v1/decisions/invalid');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid decision ID');
  });

  it('GET /api/v1/decisions/stats aggregates by type and scope', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [
        makeDecision({ id: 1, alert_id: 1, type: 'ban', scope: 'Ip' }),
        makeDecision({ id: 2, alert_id: 1, type: 'captcha', scope: 'Range' }),
      ],
    });
    const res = await app.request.get('/api/v1/decisions/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byType).toBeDefined();
    expect(res.body.byScope).toBeDefined();
  });

  it('GET /api/v1/alerts/stats totals simulated and real alerts', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1, simulated: false }), makeAlert({ id: 2, simulated: true })],
    });
    const res = await app.request.get('/api/v1/alerts/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.simulated).toBe(1);
    expect(res.body.real).toBe(1);
    expect(Array.isArray(res.body.topScenarios)).toBe(true);
    expect(Array.isArray(res.body.topCountries)).toBe(true);
  });

  it('DELETE /api/v1/alerts/:id deletes through LAPI and removes locally', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 5 })] });
    const lapi = getLapiClientMock();
    lapi.client.delete.mockResolvedValueOnce({ data: { nbDeleted: '1' } });

    const res = await app.request.delete('/api/v1/alerts/5');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Alert deleted successfully');
    expect(res.body.nbDeleted).toBe('1');

    const rows = await app.sequelize.query('SELECT COUNT(*) as c FROM alerts');
    expect(Number((rows[0] as Array<{ c: number }>)[0].c)).toBe(0);
  });

  it('DELETE /api/v1/alerts/:id returns 404 when LAPI reports nothing deleted', async () => {
    const res = await app.request.delete('/api/v1/alerts/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Alert not found');
  });
});
