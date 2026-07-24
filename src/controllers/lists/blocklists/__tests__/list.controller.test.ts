import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { makeBlocklist, makeCsBlocklist } from '@/__tests__/factories';

describe('getBlocklists', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM blocklists');
    await app.sequelize.query('DELETE FROM cs_blocklists');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('returns 200 with empty items on empty DB', async () => {
    const res = await app.request.get('/api/v1/blocklists');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns seeded blocklists', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ name: 'test-list' })] });
    const res = await app.request.get('/api/v1/blocklists');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns pagination shape', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1 })] });
    const res = await app.request.get('/api/v1/blocklists?limit=1&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
  });

  it('filters by get_only=blocklists', async () => {
    await app.seedDb({ blocklists: [makeBlocklist()] });
    const res = await app.request.get('/api/v1/blocklists?get_only=blocklists');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('filters by get_only=cs_blocklists', async () => {
    await app.seedDb({ csBlocklists: [makeCsBlocklist({ id: 'crowdsec-1' })] });
    const res = await app.request.get('/api/v1/blocklists?get_only=cs_blocklists');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns paginated response by default', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1 })] });
    const res = await app.request.get('/api/v1/blocklists');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
  });

  it('returns both api and cs blocklists', async () => {
    await app.seedDb({
      blocklists: [makeBlocklist({ id: 1, name: 'api-list' })],
      csBlocklists: [makeCsBlocklist({ id: 'crowdsec-1', name: 'cs-list' })],
    });
    const res = await app.request.get('/api/v1/blocklists');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });
});
