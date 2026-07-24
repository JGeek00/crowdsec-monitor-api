import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

vi.mock('@/services/blocklists/status-blocklist.service', async (importOriginal) => {
  const mod = await importOriginal();
  const orig = mod.statusBlocklistService;
  return {
    ...mod,
    statusBlocklistService: new Proxy(orig, {
      get(target, prop) {
        if (prop === 'isBlocklistBusy' || prop === 'isSyncingBlocklists') return () => false;
        return Reflect.get(target, prop);
      },
    }),
  };
});

import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { makeBlocklist, makeBlocklistIp } from '@/__tests__/factories';

describe('e2e blocklists', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM blocklist_ips');
    await app.sequelize.query('DELETE FROM blocklists');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('POST /api/v1/blocklists creates a new blocklist', async () => {
    const res = await app.request.post('/api/v1/blocklists').send({
      url: 'https://example.com/e2e-list.txt',
      name: 'e2e-test-list',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
  });

  it('GET /api/v1/blocklists returns paginated response', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1, name: 'test-list' })] });
    const res = await app.request.get('/api/v1/blocklists');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.items.some((b: any) => b.name === 'test-list')).toBe(true);
  });

  it('GET /api/v1/blocklists returns empty items when none exist', async () => {
    const res = await app.request.get('/api/v1/blocklists');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('POST /api/v1/blocklists/:id/refresh triggers refresh', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1 })] });
    const res = await app.request.post('/api/v1/blocklists/1/refresh');
    expect([200, 202]).toContain(res.status);
  });

  it('GET /api/v1/blocklists/:id returns blocklist detail wrapped in data', async () => {
    await app.seedDb({
      blocklists: [makeBlocklist({ id: 1 })],
      blocklistIps: [makeBlocklistIp({ id: 1, blocklist_id: 1, value: '10.0.0.1' })],
    });
    const res = await app.request.get('/api/v1/blocklists/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
  });

  it('GET /api/v1/blocklists/:id returns 404 for missing blocklist', async () => {
    const res = await app.request.get('/api/v1/blocklists/999');
    expect(res.status).toBe(404);
  });

  it('DELETE /api/v1/blocklists/:id deletes a blocklist', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1 })] });
    const res = await app.request.delete('/api/v1/blocklists/1');
    expect(res.status).toBe(202);

    const getRes = await app.request.get('/api/v1/blocklists/1');
    expect(getRes.status).toBe(404);
  });
});
