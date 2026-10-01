import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeAlert, makeChannelPayload, makeNotificationPayload } from '@tests/factories';
import { AlertsTable } from '@/models/db';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { notificationHistoryService } from '@/services/notifications/notification-history.service';

const sshAlert = {
  scenario: 'crowdsecurity/ssh-bf',
  source: { ip: '1.2.3.4', value: '1.2.3.4', scope: 'Ip', cn: 'ES' },
  origin: 'crowdsec',
  alertType: 'ban',
};

describe('e2e notifications engine and history', () => {
  let app: TestApp;
  let channelId = 0;

  const payload = (overrides: Record<string, unknown> = {}) =>
    makeNotificationPayload({ channelIds: [channelId], ...overrides });

  beforeAll(async () => {
    app = await setupApp();
  });
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        if (String(url).includes('127.0.0.1')) throw new Error('connect ECONNREFUSED 127.0.0.1:1');
        return { ok: true, status: 200 };
      }),
    );
    const res = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ name: 'ntfy', type: 'ntfy', config: { topic: 'e2e-topic' } }));
    expect(res.status).toBe(201);
    channelId = res.body.data.id as number;
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await app.sequelize.query('DELETE FROM notifications');
    await app.sequelize.query('DELETE FROM notification_channels');
    await notificationEngineService.reload();
    notificationHistoryService.clear();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/notifications/history is empty before any trigger', async () => {
    const res = await app.request.get('/api/v1/notifications/history');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('matching alert triggers the notification and appears in history', async () => {
    await app.request.post('/api/v1/notifications').send(payload());
    await notificationEngineService.handleAlert(sshAlert);

    const res = await app.request.get('/api/v1/notifications/history');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0]).toMatchObject({
      notificationName: 'ssh alerts',
      message: 'SSH brute force detected',
    });
    expect(res.body.data[0].channels[0]).toMatchObject({ type: 'ntfy', ok: true });
  });

  it('non-matching alert does not trigger', async () => {
    await app.request.post('/api/v1/notifications').send(payload());
    await notificationEngineService.handleAlert({ ...sshAlert, scenario: 'crowdsecurity/http-probing' });

    const res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(0);
  });

  it('spec user story: (scenario A or B) and country ES with 3-in-60s threshold', async () => {
    await app.request.post('/api/v1/notifications').send(
      payload({
        name: 'probing ES',
        condition: {
          type: 'and',
          children: [
            {
              type: 'or',
              children: [
                { type: 'leaf', field: 'scenario', operator: 'equals', value: 'crowdsecurity/http-probing' },
                { type: 'leaf', field: 'scenario', operator: 'equals', value: 'crowdsecurity/ssh-bf' },
              ],
            },
            { type: 'leaf', field: 'country', operator: 'equals', value: 'ES' },
          ],
        },
        threshold: { count: 3, windowSeconds: 60 },
        message: 'probing desde ES',
      }),
    );

    const probingEs = { ...sshAlert, scenario: 'crowdsecurity/http-probing' };
    await notificationEngineService.handleAlert(probingEs);
    await notificationEngineService.handleAlert({ ...probingEs, source: { ...probingEs.source, cn: 'FR' } });
    let res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(0);

    await notificationEngineService.handleAlert(probingEs);
    res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(0);

    await notificationEngineService.handleAlert({ ...sshAlert });
    res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].message).toBe('probing desde ES');
  });

  it('5 alerts with count=3 in 10s fires once (reported duplicate bug)', async () => {
    await app.request.post('/api/v1/notifications').send(
      payload({
        name: 'three-in-10s',
        threshold: { count: 3, windowSeconds: 10, cooldownSeconds: 60 },
        message: 'burst',
      }),
    );
    for (let i = 0; i < 5; i++) await notificationEngineService.handleAlert(sshAlert);
    const res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(1);
  });

  it('one burst matching two notifications fires both (independent pipelines)', async () => {
    await app.request.post('/api/v1/notifications').send(
      payload({ name: 'five-in-10s', threshold: { count: 5, windowSeconds: 10 }, message: 'five' }),
    );
    await app.request.post('/api/v1/notifications').send(
      payload({ name: 'three-in-10s', threshold: { count: 3, windowSeconds: 10 }, message: 'three' }),
    );
    for (let i = 0; i < 5; i++) await notificationEngineService.handleAlert(sshAlert);
    const res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(2);
  });

  it('history/:id/alerts returns the alert details that fired the notification', async () => {
    await app.request
      .post('/api/v1/notifications')
      .send(payload({ name: 'grouped', threshold: { count: 2, windowSeconds: 10 }, message: 'grouped' }));
    await AlertsTable.create(
      makeAlert({ id: 9001, scenario: 'crowdsecurity/ssh-bf', source: { ...makeAlert().source, ip: '9.9.9.9', value: '9.9.9.9', cn: 'ES' } }),
    );
    await AlertsTable.create(
      makeAlert({ id: 9002, scenario: 'crowdsecurity/ssh-bf', source: { ...makeAlert().source, ip: '8.8.8.8', value: '8.8.8.8', cn: 'ES' } }),
    );
    await notificationEngineService.handleAlert({ ...sshAlert, alertId: 9001 });
    await notificationEngineService.handleAlert({ ...sshAlert, alertId: 9002 });

    const history = await app.request.get('/api/v1/notifications/history');
    const entryId = history.body.data[0].id as string;
    expect(history.body.data[0].alertIds).toEqual([9001, 9002]);

    const res = await app.request.get(`/api/v1/notifications/history/${entryId}/alerts`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as { id: number }[]).map((a) => a.id).sort();
    expect(ids).toEqual([9001, 9002]);
    const first = res.body.data.find((a: { id: number }) => a.id === 9001);
    expect(first).toMatchObject({ scenario: 'crowdsecurity/ssh-bf' });
    expect(first?.source).toMatchObject({ ip: '9.9.9.9', cn: 'ES' });

    const missing = await app.request.get('/api/v1/notifications/history/nope/alerts');
    expect(missing.status).toBe(404);
  });

  it('disabled notification stops triggering but keeps its DB row', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);

    await app.request.post(`/api/v1/notifications/${id}/enabled`).send({ enabled: false });
    await notificationEngineService.handleAlert(sshAlert);
    let res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(0);

    const kept = await app.request.get(`/api/v1/notifications/${id}`);
    expect(kept.status).toBe(200);

    await app.request.post(`/api/v1/notifications/${id}/enabled`).send({ enabled: true });
    await notificationEngineService.handleAlert(sshAlert);
    res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(1);
  });

  it('deleted notification stops triggering', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);
    await app.request.delete(`/api/v1/notifications/${id}`);

    await notificationEngineService.handleAlert(sshAlert);
    const res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(0);
  });

  it('edited condition applies to subsequent alerts', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);
    await app.request
      .put(`/api/v1/notifications/${id}`)
      .send({ condition: { type: 'leaf', field: 'country', operator: 'equals', value: 'FR' } });

    await notificationEngineService.handleAlert(sshAlert);
    let res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(0);

    await notificationEngineService.handleAlert({ ...sshAlert, source: { ...sshAlert.source, cn: 'FR' } });
    res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(1);
  });

  it('history returns newest first with channel failure detail', async () => {
    const deadRes = await app.request
      .post('/api/v1/notification-channels')
      .send(
        makeChannelPayload({
          name: 'dead',
          type: 'ntfy',
          config: { server: 'http://127.0.0.1:1', topic: 'dead-topic' },
        }),
      );
    const brokenRes = await app.request.post('/api/v1/notifications').send(
      payload({
        name: 'broken ntfy',
        message: 'first',
        channelIds: [deadRes.body.data.id],
      }),
    );
    expect(brokenRes.status).toBe(201);
    await notificationEngineService.handleAlert(sshAlert);
    await app.request.post('/api/v1/notifications').send(
      payload({
        name: 'second',
        message: 'second',
        condition: { type: 'leaf', field: 'country', operator: 'equals', value: 'ES' },
      }),
    );
    await notificationEngineService.handleAlert(sshAlert);

    const res = await app.request.get('/api/v1/notifications/history');
    expect(res.body.total).toBe(3);
    expect(res.body.data[0].notificationName).toBe('second');
    expect(res.body.data[1].notificationName).toBe('broken ntfy');
    expect(res.body.data[1].channels[0]).toMatchObject({ type: 'ntfy', ok: false });
    expect(res.body.data[1].channels[0].detail).toBeTruthy();
    expect(res.body.data[0].triggeredAt).toBeDefined();
    expect(res.body.data[0].id).toBeDefined();
  });
});
