import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeBlocklist } from '@tests/factories';

describe('blocklist routes', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM blocklists');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/blocklists returns 200', async () => {
    const res = await app.request.get('/api/v1/blocklists');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/blocklists/:id returns 200 for existing blocklist', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1 })] });
    const res = await app.request.get('/api/v1/blocklists/1');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/blocklists/:id returns 404 for missing blocklist', async () => {
    const res = await app.request.get('/api/v1/blocklists/999');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/blocklists/:id/ips returns 200', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1 })] });
    const res = await app.request.get('/api/v1/blocklists/1/ips');
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/blocklists returns 201', async () => {
    const res = await app.request
      .post('/api/v1/blocklists')
      .send({ url: 'https://example.com/test.txt', name: 'test' });
    expect(res.status).toBe(201);
  });

  it('DELETE /api/v1/blocklists/:id returns 404 for missing blocklist', async () => {
    const res = await app.request.delete('/api/v1/blocklists/999');
    expect(res.status).toBe(404);
  });
});
