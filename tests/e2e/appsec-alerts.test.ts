import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';
import { makeChannelPayload, makeNotificationPayload } from '@tests/setup/factories';
import { crowdSecAPI } from '@/infrastructure/crowdsec/lapi/crowdsec-api';
import { alertsSyncService } from '@/infrastructure/sync/alerts-sync';
import { notificationHistoryService } from '@/infrastructure/notifications/history';

const wafLapiAlert = (overrides: Record<string, unknown> = {}) => ({
  id: 77,
  uuid: 'waf-uuid-77',
  scenario: 'crowdsecurity/vpatch-env-access',
  scenario_version: '0.4',
  scenario_hash: 'h',
  message: 'WAF block: crowdsecurity/vpatch-env-access',
  capacity: 1,
  leakspeed: '',
  simulated: false,
  remediation: true,
  events_count: 1,
  machine_id: 'localhost',
  source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
  labels: null,
  kind: 'waf',
  meta: [
    { key: 'method', value: '["GET"]' },
    { key: 'target_uri', value: '["/.env"]' },
  ],
  events: [
    {
      timestamp: '2026-11-21 20:30:31 +0000 UTC',
      meta: [
        { key: 'rule_name', value: 'crowdsecurity/vpatch-env-access' },
        { key: 'uri', value: '/.env' },
        { key: 'target_fqdn', value: 'linkwarden.jgeek00.com' },
        { key: 'data' },
      ],
    },
  ],
  decisions: null,
  created_at: new Date().toISOString(),
  start_at: new Date().toISOString(),
  stop_at: new Date().toISOString(),
  ...overrides,
});

const blocklistLapiAlert = () => ({
  ...wafLapiAlert(),
  id: 78,
  uuid: 'blocklist-uuid-78',
  scenario: 'external/blocklist (my-list)',
  kind: 'crowdsec',
  events: [],
  decisions: [
    {
      id: 1,
      origin: 'lists',
      type: 'ban',
      scope: 'Ip',
      value: '9.9.9.9',
      duration: '24h',
      scenario: 'external/blocklist (my-list)',
      simulated: false,
    },
  ],
});

describe('e2e AppSec alerts (waf + bot-detection)', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await app.sequelize.query('DELETE FROM decisions');
    await app.sequelize.query('DELETE FROM alerts');
    await app.sequelize.query('DELETE FROM notifications');
    await app.sequelize.query('DELETE FROM notification_channels');
    notificationHistoryService.clear();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('syncs a WAF alert from LAPI into DB and serves it via list/detail/stats', async () => {
    vi.spyOn(crowdSecAPI.alerts, 'getAlerts').mockResolvedValue([wafLapiAlert()] as never);
    const result = await alertsSyncService.syncAlerts();
    expect(result.synced).toBe(1);
    expect(result.errors).toBe(0);

    const list = await app.request.get('/api/v1/alerts?is_appsec=true');
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      is_appsec: true,
      appsec_rule: 'crowdsecurity/vpatch-env-access',
      appsec_uri: '/.env',
      appsec_host: 'linkwarden.jgeek00.com',
      appsec_method: 'GET',
    });

    const classic = await app.request.get('/api/v1/alerts?is_appsec=false');
    expect(classic.status).toBe(200);
    expect(classic.body.items).toHaveLength(0);

    const detail = await app.request.get('/api/v1/alerts/77');
    expect(detail.status).toBe(200);
    expect(detail.body.is_appsec).toBe(true);
    expect(detail.body.appsec_rule).toBe('crowdsecurity/vpatch-env-access');

    const stats = await app.request.get('/api/v1/alerts/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.appsecTotal).toBe(1);
    expect(stats.body.topAppsecRules).toEqual([{ rule: 'crowdsecurity/vpatch-env-access', count: 1 }]);
    expect(stats.body.topAppsecHosts).toEqual([{ host: 'linkwarden.jgeek00.com', count: 1 }]);
  });

  it('does not import blocklist alerts from LAPI sync', async () => {
    vi.spyOn(crowdSecAPI.alerts, 'getAlerts').mockResolvedValue([blocklistLapiAlert()] as never);
    const result = await alertsSyncService.syncAlerts();
    expect(result.synced).toBe(0);

    const list = await app.request.get('/api/v1/alerts');
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(0);
  });

  it('fires an appsecRule notification end to end', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200 })),
    );
    const channel = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ name: 'ntfy', type: 'ntfy', config: { topic: 'e2e-appsec' } }));
    expect(channel.status).toBe(201);

    const created = await app.request.post('/api/v1/notifications').send(
      makeNotificationPayload({
        name: 'waf env access',
        channelIds: [channel.body.data.id],
        condition: { type: 'leaf', field: 'appsecRule', operator: 'contains', value: 'vpatch-env' },
      }),
    );
    expect(created.status).toBe(201);

    vi.spyOn(crowdSecAPI.alerts, 'getAlerts').mockResolvedValue([wafLapiAlert()] as never);
    await alertsSyncService.syncAlerts();

    const history = await app.request.get('/api/v1/notifications/history');
    expect(history.status).toBe(200);
    expect(history.body.total).toBe(1);
    expect(history.body.data[0]).toMatchObject({ notificationName: 'waf env access' });
  });
});
