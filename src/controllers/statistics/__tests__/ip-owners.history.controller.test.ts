import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { makeAlert } from '@/__tests__/factories';

describe('getIpOwnerHistory', () => {
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

  it('returns 200 with empty array for unknown owner', async () => {
    const res = await app.request.get('/api/v1/statistics/ip-owners/UNKNOWN');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns history for an IP owner that has alerts', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/statistics/ip-owners/EXAMPLE-AS');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('date');
    expect(res.body[0]).toHaveProperty('amount');
  });
});
