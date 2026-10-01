import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeChannelPayload, makeNotificationPayload } from '@tests/factories';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { notificationHistoryService } from '@/services/notifications/notification-history.service';

describe('e2e notification channels', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupApp();
  });
  beforeEach(async () => {
    await app.sequelize.query('DELETE FROM notifications');
    await app.sequelize.query('DELETE FROM notification_channels');
    await notificationEngineService.reload();
    notificationHistoryService.clear();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM notifications');
    await app.sequelize.query('DELETE FROM notification_channels');
    await notificationEngineService.reload();
    notificationHistoryService.clear();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/notification-channels returns empty list when none exist', async () => {
    const res = await app.request.get('/api/v1/notification-channels');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('POST creates email and ntfy channels', async () => {
    const email = await app.request.post('/api/v1/notification-channels').send(makeChannelPayload());
    expect(email.status).toBe(201);
    expect(email.body.data).toMatchObject({ name: 'ops email', type: 'email' });

    const ntfy = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ name: 'phone', type: 'ntfy', config: { topic: 'my-alerts_01' } }));
    expect(ntfy.status).toBe(201);
    expect(ntfy.body.data).toMatchObject({ name: 'phone', type: 'ntfy' });

    const list = await app.request.get('/api/v1/notification-channels');
    expect(list.body.data).toHaveLength(2);
  });

  it('POST returns 400 for missing name, bad type or missing config', async () => {
    const noName = await app.request.post('/api/v1/notification-channels').send({
      type: 'email',
      config: {},
    });
    expect(noName.status).toBe(400);

    const badType = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ type: 'sms' }));
    expect(badType.status).toBe(400);

    const noConfig = await app.request.post('/api/v1/notification-channels').send({ name: 'x', type: 'email' });
    expect(noConfig.status).toBe(400);
  });

  it('POST validates ntfy provider fields', async () => {
    const badTopic = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ type: 'ntfy', config: { topic: 'with spaces!' } }));
    expect(badTopic.status).toBe(400);
    expect(badTopic.body.message).toContain('topic');

    const userWithoutPass = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ type: 'ntfy', config: { topic: 'ok', username: 'u' } }));
    expect(userWithoutPass.status).toBe(400);

    const tokenWithBasic = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ type: 'ntfy', config: { topic: 'ok', username: 'u', password: 'p', accessToken: 't' } }));
    expect(tokenWithBasic.status).toBe(400);
  });

  it('POST validates email provider fields', async () => {
    const noHost = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ config: { from: 'a@b.c', to: 'd@e.f' } }));
    expect(noHost.status).toBe(400);

    const badFrom = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ config: { host: 'h', from: 'nope', to: 'd@e.f' } }));
    expect(badFrom.status).toBe(400);

    const badTo = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ config: { host: 'h', from: 'a@b.c', to: 'nope' } }));
    expect(badTo.status).toBe(400);
  });

  it('GET /:id returns detail, 404 when missing, 400 for non-integer id', async () => {
    const created = await app.request.post('/api/v1/notification-channels').send(makeChannelPayload());
    const found = await app.request.get(`/api/v1/notification-channels/${String(created.body.data.id)}`);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe('ops email');

    expect((await app.request.get('/api/v1/notification-channels/9999')).status).toBe(404);
    expect((await app.request.get('/api/v1/notification-channels/abc')).status).toBe(400);
  });

  it('PUT renames and switches provider with revalidation', async () => {
    const created = await app.request.post('/api/v1/notification-channels').send(makeChannelPayload());
    const id = String(created.body.data.id);

    const renamed = await app.request.put(`/api/v1/notification-channels/${id}`).send({ name: 'renamed' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe('renamed');

    const switched = await app.request
      .put(`/api/v1/notification-channels/${id}`)
      .send({ type: 'ntfy', config: { topic: 'new-topic' } });
    expect(switched.status).toBe(200);
    expect(switched.body.data.type).toBe('ntfy');

    const badSwitch = await app.request
      .put(`/api/v1/notification-channels/${id}`)
      .send({ config: { topic: 'bad topic!' } });
    expect(badSwitch.status).toBe(400);

    expect((await app.request.put('/api/v1/notification-channels/9999').send({ name: 'x' })).status).toBe(404);
  });

  it('POST /:id/test sends a test message and returns the result', async () => {
    const created = await app.request
      .post('/api/v1/notification-channels')
      .send(
        makeChannelPayload({
          name: 'dead ntfy',
          type: 'ntfy',
          config: { server: 'http://127.0.0.1:1', topic: 'test-topic' },
        }),
      );
    const id = String(created.body.data.id);
    const res = await app.request.post(`/api/v1/notification-channels/${id}/test`).send({ message: 'ping' });
    expect(res.status).toBe(200);
    expect(res.body.data.channelId).toBe(created.body.data.id);
    expect(res.body.data.ok).toBe(false);
    expect(res.body.data.detail).toBeTruthy();

    expect((await app.request.post('/api/v1/notification-channels/9999/test').send({})).status).toBe(404);

    const history = await app.request.get('/api/v1/notifications/history');
    expect(history.body.total).toBe(0);
  });

  it('POST /test tests an unsaved config without persisting', async () => {
    const res = await app.request.post('/api/v1/notification-channels/test').send({
      type: 'ntfy',
      config: { server: 'http://127.0.0.1:1', topic: 'probe' },
      message: 'ping',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.channelId).toBeNull();
    expect(res.body.data.ok).toBe(false);
    expect(res.body.data.detail).toBeTruthy();

    const list = await app.request.get('/api/v1/notification-channels');
    expect(list.body.data).toEqual([]);
  });

  it('POST /test returns 400 for bad type or config', async () => {
    const badType = await app.request
      .post('/api/v1/notification-channels/test')
      .send({ type: 'sms', config: {} });
    expect(badType.status).toBe(400);

    const badConfig = await app.request
      .post('/api/v1/notification-channels/test')
      .send({ type: 'ntfy', config: { topic: 'bad topic!' } });
    expect(badConfig.status).toBe(400);
  });

  it('GET /api/v1/notification-channels/providers serves the definitions', async () => {
    const res = await app.request.get('/api/v1/notification-channels/providers');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    const types = (res.body.providers as { type: string }[]).map((p) => p.type).sort();
    expect(types).toEqual(['email', 'ntfy']);
    const ntfy = (res.body.providers as { type: string; fields: { key: string; visibleIf?: unknown }[] }[]).find(
      (p) => p.type === 'ntfy',
    );
    expect(ntfy?.fields.some((f) => f.key === 'topic')).toBe(true);
    expect(ntfy?.fields.some((f) => f.key === 'password' && f.visibleIf !== undefined)).toBe(true);
    const providers = res.body.providers as { fields: { key: string; secret?: boolean; default?: unknown }[] }[];
    for (const provider of providers) {
      for (const field of provider.fields) {
        if (field.secret === true) expect(field.default).toBeUndefined();
      }
    }
  });

  it('POST returns 400 for unknown provider type or unknown keys', async () => {
    const badType = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ type: 'sms', config: {} }));
    expect(badType.status).toBe(400);

    const badKeys = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ config: { host: 'h', from: 'a@b.c', to: 'd@e.f', nope: 1 } }));
    expect(badKeys.status).toBe(400);
  });

  it('secrets are never exposed and survive name-only updates', async () => {
    const created = await app.request.post('/api/v1/notification-channels').send(
      makeChannelPayload({
        name: 'smtp',
        config: { host: 'h', username: 'u', password: 'p', from: 'a@b.c', to: 'd@e.f' },
      }),
    );
    expect(created.status).toBe(201);
    expect(created.body.data.config.password).toBeUndefined();
    const id = String(created.body.data.id);

    const detail = await app.request.get(`/api/v1/notification-channels/${id}`);
    expect(detail.body.data.config.password).toBeUndefined();
    expect(detail.body.data.config.username).toBe('u');

    const renamed = await app.request.put(`/api/v1/notification-channels/${id}`).send({ name: 'smtp2' });
    expect(renamed.status).toBe(200);

    const partial = await app.request.put(`/api/v1/notification-channels/${id}`).send({ config: { host: 'h2' } });
    expect(partial.status).toBe(200);
    expect(partial.body.data.config.host).toBe('h2');
    expect(partial.body.data.config.password).toBeUndefined();
  });

  it('empty-string secret deletes it', async () => {
    const created = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ name: 'n', type: 'ntfy', config: { topic: 't', accessToken: 'tk' } }));
    const id = String(created.body.data.id);
    const updated = await app.request.put(`/api/v1/notification-channels/${id}`).send({ config: { accessToken: '' } });
    expect(updated.status).toBe(200);
    expect('accessToken' in (updated.body.data.config as Record<string, unknown>)).toBe(false);
  });

  it('DELETE removes the channel and 404 afterwards', async () => {
    const created = await app.request.post('/api/v1/notification-channels').send(makeChannelPayload());
    const id = String(created.body.data.id);
    const deleted = await app.request.delete(`/api/v1/notification-channels/${id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.message).toBe('Channel deleted');
    expect((await app.request.get(`/api/v1/notification-channels/${id}`)).status).toBe(404);
    expect((await app.request.delete('/api/v1/notification-channels/9999')).status).toBe(404);
  });

  it('DELETE returns 409 when a notification references the channel', async () => {
    const channel = await app.request.post('/api/v1/notification-channels').send(makeChannelPayload());
    const channelId = channel.body.data.id as number;
    const notification = await app.request
      .post('/api/v1/notifications')
      .send(makeNotificationPayload({ channelIds: [channelId] }));
    expect(notification.status).toBe(201);

    const blocked = await app.request.delete(`/api/v1/notification-channels/${String(channelId)}`);
    expect(blocked.status).toBe(409);

    await app.request.delete(`/api/v1/notifications/${String(notification.body.data.id)}`);
    const deleted = await app.request.delete(`/api/v1/notification-channels/${String(channelId)}`);
    expect(deleted.status).toBe(200);
  });
});
