import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert } from '@tests/factories';

describe('getTargetHistory', () => {
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

  it('returns 200 with empty array for unknown target', async () => {
    const res = await app.request.get('/api/v1/statistics/targets/unknown.com');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns history for a target', async () => {
    await app.seedDb({
      alerts: [
        makeAlert({
          id: 1,
          events: [
            {
              timestamp: new Date().toISOString(),
              meta: [{ key: 'target_fqdn', value: 'example.com' }],
            },
          ],
          crowdsec_created_at: new Date('2026-07-23T00:00:00Z'),
        }),
        makeAlert({
          id: 2,
          events: [
            {
              timestamp: new Date().toISOString(),
              meta: [{ key: 'target_fqdn', value: 'example.com' }],
            },
          ],
          crowdsec_created_at: new Date('2026-07-23T00:00:00Z'),
        }),
        makeAlert({
          id: 3,
          events: [
            {
              timestamp: new Date().toISOString(),
              meta: [{ key: 'target_fqdn', value: 'other.com' }],
            },
          ],
          crowdsec_created_at: new Date('2026-07-23T00:00:00Z'),
        }),
      ],
    });
    const res = await app.request.get('/api/v1/statistics/targets/example.com');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].date).toBe('2026-07-23');
    expect(res.body[0].amount).toBe(2);
  });

  it('ignores alerts without matching target_fqdn', async () => {
    await app.seedDb({
      alerts: [
        makeAlert({
          id: 1,
          events: [
            {
              timestamp: new Date().toISOString(),
              meta: [{ key: 'other_key', value: 'irrelevant' }],
            },
          ],
          crowdsec_created_at: new Date('2026-07-23T00:00:00Z'),
        }),
      ],
    });
    const res = await app.request.get('/api/v1/statistics/targets/example.com');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
