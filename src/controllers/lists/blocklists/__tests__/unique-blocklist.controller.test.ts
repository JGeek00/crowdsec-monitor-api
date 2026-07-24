import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { makeBlocklist, makeBlocklistIp, makeCsBlocklist } from '@/__tests__/factories';

describe('getBlocklistById', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM blocklists');
    await app.sequelize.query('DELETE FROM blocklist_ips');
    await app.sequelize.query('DELETE FROM cs_blocklists');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('returns 200 for existing API blocklist', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1, name: 'test' })] });
    const res = await app.request.get('/api/v1/blocklists/1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('1');
  });

  it('returns 404 for non-existent blocklist', async () => {
    const res = await app.request.get('/api/v1/blocklists/999');
    expect(res.status).toBe(404);
  });

  it('includes IPs when include_ips=full', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1 })] });
    const res = await app.request.get('/api/v1/blocklists/1?include_ips=full');
    expect(res.status).toBe(200);
    expect(res.body.data.blocklistIps).toBeDefined();
  });

  it('returns IP strings when include_ips=ip_string', async () => {
    await app.seedDb({
      blocklists: [makeBlocklist({ id: 1 })],
      blocklistIps: [makeBlocklistIp({ blocklist_id: 1, value: '10.0.0.1' })],
    });
    const res = await app.request.get('/api/v1/blocklists/1?include_ips=ip_string');
    expect(res.status).toBe(200);
    expect(res.body.data.blocklistIps).toEqual(['10.0.0.1']);
  });

  it('returns 200 for cs-blocklist', async () => {
    await app.seedDb({
      csBlocklists: [makeCsBlocklist({ id: 'crowdsec-1', name: 'cs-list' })],
    });
    const res = await app.request.get('/api/v1/blocklists/crowdsec-1');
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('cs');
  });

  it('returns 404 for non-existent cs-blocklist', async () => {
    const res = await app.request.get('/api/v1/blocklists/crowdsec-missing');
    expect(res.status).toBe(404);
  });

  it('returns IPs for cs-blocklist with include_ips', async () => {
    await app.seedDb({
      csBlocklists: [makeCsBlocklist({ id: 'crowdsec-1' })],
      blocklistIps: [makeBlocklistIp({ cs_blocklist_id: 'crowdsec-1', blocklist_id: null, value: '10.0.0.1' })],
    });
    const res = await app.request.get('/api/v1/blocklists/crowdsec-1?include_ips=full');
    expect(res.status).toBe(200);
    expect(res.body.data.blocklistIps).toBeDefined();
    expect(res.body.data.blocklistIps).toHaveLength(1);
  });
});
