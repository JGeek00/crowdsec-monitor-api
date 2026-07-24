import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert } from '@tests/factories';

describe('getTopIpOwners', () => {
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
    const res = await app.request.get('/api/v1/statistics/ip-owners');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns top IP owners with seeded data', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/statistics/ip-owners');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('ipOwner');
    expect(res.body[0]).toHaveProperty('amount');
  });
});
