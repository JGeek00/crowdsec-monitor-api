import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert } from '@tests/factories';

describe('getTopTargets', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM alerts');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('returns 200 with empty array on empty DB', async () => {
    const res = await app.request.get('/api/v1/statistics/targets');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns top targets with seeded data', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/statistics/targets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
