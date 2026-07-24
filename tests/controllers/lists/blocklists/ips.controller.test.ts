import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';
import { makeBlocklist, makeBlocklistIp, makeCsBlocklist } from '@tests/factories';

describe('getBlocklistIps', () => {
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

  it('returns 200 with empty items for blocklist with no IPs', async () => {
    await app.seedDb({ blocklists: [makeBlocklist({ id: 1 })] });
    const res = await app.request.get('/api/v1/blocklists/1/ips');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns 404 for non-existent blocklist', async () => {
    const res = await app.request.get('/api/v1/blocklists/999/ips');
    expect(res.status).toBe(404);
  });

  it('returns 200 with items for cs-blocklist', async () => {
    await app.seedDb({
      csBlocklists: [makeCsBlocklist({ id: 'crowdsec-test' })],
      blocklistIps: [makeBlocklistIp({ cs_blocklist_id: 'crowdsec-test', blocklist_id: null })],
    });
    const res = await app.request.get('/api/v1/blocklists/crowdsec-test/ips');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('returns 404 for non-existent cs-blocklist', async () => {
    const res = await app.request.get('/api/v1/blocklists/crowdsec-missing/ips');
    expect(res.status).toBe(404);
  });

  it('returns ip strings when ip_string=true', async () => {
    await app.seedDb({
      blocklists: [makeBlocklist({ id: 1 })],
      blocklistIps: [makeBlocklistIp({ blocklist_id: 1, value: '10.0.0.1' })],
    });
    const res = await app.request.get('/api/v1/blocklists/1/ips?ip_string=true');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual(['10.0.0.1']);
  });

  it('returns paginated response when unpaged is not set', async () => {
    await app.seedDb({
      blocklists: [makeBlocklist({ id: 1 })],
      blocklistIps: [makeBlocklistIp({ blocklist_id: 1, value: '10.0.0.1' })],
    });
    const res = await app.request.get('/api/v1/blocklists/1/ips');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
  });
});
