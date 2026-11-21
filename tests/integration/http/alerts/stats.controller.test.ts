import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';
import { makeAlert } from '@tests/setup/factories';

describe('getAlertStats', () => {
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

  it('returns 200 with zero counts on empty DB', async () => {
    const res = await app.request.get('/api/v1/alerts/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.simulated).toBe(0);
    expect(res.body.real).toBe(0);
  });

  it('returns stats with seeded alerts', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1, simulated: false }), makeAlert({ id: 2, simulated: true })],
    });
    const res = await app.request.get('/api/v1/alerts/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.simulated).toBe(1);
    expect(res.body.real).toBe(1);
  });

  it('returns AppSec totals and tops', async () => {
    await app.seedDb({
      alerts: [
        makeAlert({ id: 1 }),
        makeAlert({
          id: 2,
          scenario: 'crowdsecurity/vpatch-env-access',
          is_appsec: true,
          appsec_rule: 'crowdsecurity/vpatch-env-access',
          appsec_host: 'linkwarden.jgeek00.com',
        }),
        makeAlert({
          id: 3,
          scenario: 'crowdsecurity/vpatch-env-access',
          is_appsec: true,
          appsec_rule: 'crowdsecurity/vpatch-env-access',
          appsec_host: 'linkwarden.jgeek00.com',
        }),
      ],
    });
    const res = await app.request.get('/api/v1/alerts/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.appsecTotal).toBe(2);
    expect(res.body.topAppsecRules).toEqual([{ rule: 'crowdsecurity/vpatch-env-access', count: 2 }]);
    expect(res.body.topAppsecHosts).toEqual([{ host: 'linkwarden.jgeek00.com', count: 2 }]);
  });

  it('returns topScenarios array', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request.get('/api/v1/alerts/stats');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.topScenarios)).toBe(true);
    expect(Array.isArray(res.body.topCountries)).toBe(true);
    expect(Array.isArray(res.body.topOrganizations)).toBe(true);
  });
});
