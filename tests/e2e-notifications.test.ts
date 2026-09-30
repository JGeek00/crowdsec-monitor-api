import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeChannelPayload, makeNotificationPayload } from '@tests/factories';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { notificationHistoryService } from '@/services/notifications/notification-history.service';

describe('e2e notifications CRUD', () => {
  let app: TestApp;
  let channelId = 0;

  const payload = (overrides: Record<string, unknown> = {}) =>
    makeNotificationPayload({ channelIds: [channelId], ...overrides });

  beforeAll(async () => {
    app = await setupApp();
  });
  beforeEach(async () => {
    const res = await app.request.post('/api/v1/notification-channels').send(makeChannelPayload());
    expect(res.status).toBe(201);
    channelId = res.body.data.id as number;
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

  it('GET /api/v1/notifications returns empty list when none exist', async () => {
    const res = await app.request.get('/api/v1/notifications');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('POST /api/v1/notifications creates a notification with defaults', async () => {
    const res = await app.request.post('/api/v1/notifications').send(payload());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'ssh alerts', enabled: true, channelIds: [channelId] });
    expect(res.body.data).toHaveProperty('id');
  });

  it('POST creates with description, threshold and disabled flag', async () => {
    const res = await app.request
      .post('/api/v1/notifications')
      .send(payload({ description: 'optional desc', enabled: false, threshold: { count: 5, windowSeconds: 60 } }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      description: 'optional desc',
      enabled: false,
      threshold: { count: 5, windowSeconds: 60 },
    });
  });

  it('POST returns 400 when name is missing', async () => {
    const body = payload();
    delete (body as Partial<typeof body>).name;
    const res = await app.request.post('/api/v1/notifications').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('POST returns 400 when message is missing', async () => {
    const res = await app.request.post('/api/v1/notifications').send(payload({ message: '' }));
    expect(res.status).toBe(400);
  });

  it('POST returns 400 when channelIds is empty or invalid', async () => {
    const empty = await app.request.post('/api/v1/notifications').send(payload({ channelIds: [] }));
    expect(empty.status).toBe(400);

    const invalid = await app.request.post('/api/v1/notifications').send(payload({ channelIds: [0] }));
    expect(invalid.status).toBe(400);
  });

  it('POST returns 422 when a channel does not exist', async () => {
    const res = await app.request.post('/api/v1/notifications').send(payload({ channelIds: [9999] }));
    expect(res.status).toBe(422);
    expect(res.body.message).toContain('9999');
  });

  it('POST returns 400 when condition shape is unsupported', async () => {
    const res = await app.request.post('/api/v1/notifications').send(payload({ condition: { type: 'nope' } }));
    expect(res.status).toBe(400);
  });

  it('POST accepts an empty and (no condition, matches everything)', async () => {
    const res = await app.request
      .post('/api/v1/notifications')
      .send(payload({ condition: { type: 'and', children: [] } }));
    expect(res.status).toBe(201);
  });

  it('POST returns 400 when threshold is out of range', async () => {
    const res = await app.request
      .post('/api/v1/notifications')
      .send(payload({ threshold: { count: 0, windowSeconds: 5 } }));
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/notifications lists created notifications', async () => {
    await app.request.post('/api/v1/notifications').send(payload({ name: 'first' }));
    await app.request.post('/api/v1/notifications').send(payload({ name: 'second' }));
    const res = await app.request.get('/api/v1/notifications');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((n: { name: string }) => n.name).sort()).toEqual(['first', 'second']);
  });

  it('GET /api/v1/notifications/:id returns detail and 404 when missing', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const found = await app.request.get(`/api/v1/notifications/${String(created.body.data.id)}`);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe('ssh alerts');

    const missing = await app.request.get('/api/v1/notifications/9999');
    expect(missing.status).toBe(404);
  });

  it('GET /api/v1/notifications/:id returns 400 for non-integer id', async () => {
    const res = await app.request.get('/api/v1/notifications/abc');
    expect(res.status).toBe(400);
  });

  it('PUT /api/v1/notifications/:id updates name and message', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);
    const res = await app.request.put(`/api/v1/notifications/${id}`).send({ name: 'renamed', message: 'new msg' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'renamed', message: 'new msg' });
  });

  it('PUT updates the condition tree and the channel selection', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);
    const second = await app.request
      .post('/api/v1/notification-channels')
      .send(makeChannelPayload({ name: 'ntfy', type: 'ntfy', config: { topic: 'alerts' } }));
    const condition = { type: 'leaf', field: 'country', operator: 'equals', value: 'ES' };
    const res = await app.request
      .put(`/api/v1/notifications/${id}`)
      .send({ condition, channelIds: [second.body.data.id] });
    expect(res.status).toBe(200);
    expect(res.body.data.condition).toEqual(condition);
    expect(res.body.data.channelIds).toEqual([second.body.data.id]);
  });

  it('PUT returns 400 for invalid condition and 422 for unknown channels', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);
    const bad = await app.request.put(`/api/v1/notifications/${id}`).send({ condition: { type: 'bad' } });
    expect(bad.status).toBe(400);

    const unknown = await app.request.put(`/api/v1/notifications/${id}`).send({ channelIds: [9999] });
    expect(unknown.status).toBe(422);

    const missing = await app.request.put('/api/v1/notifications/9999').send({ name: 'x' });
    expect(missing.status).toBe(404);
  });

  it('POST /api/v1/notifications/:id/enabled toggles the flag', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);

    const off = await app.request.post(`/api/v1/notifications/${id}/enabled`).send({ enabled: false });
    expect(off.status).toBe(200);
    expect(off.body.data.enabled).toBe(false);

    const on = await app.request.post(`/api/v1/notifications/${id}/enabled`).send({ enabled: true });
    expect(on.status).toBe(200);
    expect(on.body.data.enabled).toBe(true);
  });

  it('POST /:id/enabled returns 400 for non-boolean and 404 when missing', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);
    const bad = await app.request.post(`/api/v1/notifications/${id}/enabled`).send({ enabled: 'yes' });
    expect(bad.status).toBe(400);

    const missing = await app.request.post('/api/v1/notifications/9999/enabled').send({ enabled: true });
    expect(missing.status).toBe(404);
  });

  it('DELETE /api/v1/notifications/:id removes it and 404 afterwards', async () => {
    const created = await app.request.post('/api/v1/notifications').send(payload());
    const id = String(created.body.data.id);
    const deleted = await app.request.delete(`/api/v1/notifications/${id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.message).toBe('Notification deleted');

    const gone = await app.request.get(`/api/v1/notifications/${id}`);
    expect(gone.status).toBe(404);

    const missing = await app.request.delete('/api/v1/notifications/9999');
    expect(missing.status).toBe(404);
  });
});
