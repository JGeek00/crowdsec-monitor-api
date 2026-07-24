import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeDecision, makeAlert } from '@tests/factories';

describe('decision routes', () => {
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

  it('GET /api/v1/decisions returns 200', async () => {
    const res = await app.request.get('/api/v1/decisions');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/decisions/:id returns 200 for existing decision', async () => {
    await app.seedDb({ alerts: [makeAlert()], decisions: [makeDecision({ id: 1, alert_id: 1 })] });
    const res = await app.request.get('/api/v1/decisions/1');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/decisions/:id returns 404 for missing decision', async () => {
    const res = await app.request.get('/api/v1/decisions/999');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/decisions/by-ip returns 200', async () => {
    const res = await app.request.get('/api/v1/decisions/by-ip');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/decisions/by-ip/:ip returns 200', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 1, alert_id: 1, value: '1.2.3.4' })],
    });
    const res = await app.request.get('/api/v1/decisions/by-ip/1.2.3.4');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/decisions/stats returns 200', async () => {
    const res = await app.request.get('/api/v1/decisions/stats');
    expect(res.status).toBe(200);
  });

  it('DELETE /api/v1/decisions/:id returns 404 for missing decision', async () => {
    const res = await app.request.delete('/api/v1/decisions/999');
    expect(res.status).toBe(404);
  });
});
