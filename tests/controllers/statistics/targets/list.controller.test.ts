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

  it('returns sorted targets from alerts', async () => {
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
        }),
        makeAlert({
          id: 2,
          events: [
            {
              timestamp: new Date().toISOString(),
              meta: [{ key: 'target_fqdn', value: 'example.com' }],
            },
          ],
        }),
        makeAlert({
          id: 3,
          events: [
            {
              timestamp: new Date().toISOString(),
              meta: [{ key: 'target_fqdn', value: 'other.com' }],
            },
          ],
        }),
      ],
    });
    const res = await app.request.get('/api/v1/statistics/targets');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Sorted by amount descending
    expect(res.body[0].target).toBe('example.com');
    expect(res.body[0].amount).toBe(2);
    expect(res.body[1].target).toBe('other.com');
    expect(res.body[1].amount).toBe(1);
  });

  it('handles alerts without target_fqdn in events meta', async () => {
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
        }),
      ],
    });
    const res = await app.request.get('/api/v1/statistics/targets');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('counts each target only once per alert', async () => {
    await app.seedDb({
      alerts: [
        makeAlert({
          id: 1,
          events: [
            {
              timestamp: new Date().toISOString(),
              meta: [
                { key: 'target_fqdn', value: 'example.com' },
                { key: 'target_fqdn', value: 'example.com' },
              ],
            },
          ],
        }),
      ],
    });
    const res = await app.request.get('/api/v1/statistics/targets');
    expect(res.status).toBe(200);
    expect(res.body[0].amount).toBe(1);
  });
});
