import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';
import { makeBlocklist, makeBlocklistIp } from '@tests/setup/factories';

describe('e2e list checks and blocklist lookups', () => {
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

  it('POST /api/v1/lists/check-ips reports which blocklist contains each IP', async () => {
    await app.seedDb({ blocklists: [makeBlocklist()], blocklistIps: [makeBlocklistIp({ value: '10.0.0.1' })] });

    const res = await app.request.post('/api/v1/lists/check-ips').send({ ips: ['10.0.0.1', '9.9.9.9'] });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);

    const listed = res.body.results.find((r: { ip: string }) => r.ip === '10.0.0.1');
    const free = res.body.results.find((r: { ip: string }) => r.ip === '9.9.9.9');
    expect(listed.blocklists).toContain('test-blocklist');
    expect(listed.allowlists).toEqual([]);
    expect(free.blocklists).toEqual([]);
  });

  it('POST /api/v1/lists/check-ips returns 400 for invalid IPs', async () => {
    const res = await app.request.post('/api/v1/lists/check-ips').send({ ips: ['not-an-ip'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('POST /api/v1/blocklists/check reports matches with blocklist names only', async () => {
    await app.seedDb({ blocklists: [makeBlocklist()], blocklistIps: [makeBlocklistIp({ value: '10.0.0.2' })] });

    const res = await app.request.post('/api/v1/blocklists/check').send({ ips: ['10.0.0.2'] });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toEqual({ ip: '10.0.0.2', blocklists: ['test-blocklist'] });
  });

  it('POST /api/v1/lists/check-domain returns 422 for an unresolvable domain', async () => {
    const res = await app.request.post('/api/v1/lists/check-domain').send({ domain: 'nonexistent.invalid' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Unprocessable entity');
  });

  it('POST /api/v1/blocklists/check-domain returns 422 for an unresolvable domain', async () => {
    const res = await app.request.post('/api/v1/blocklists/check-domain').send({ domain: 'nonexistent.invalid' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Unprocessable entity');
  });

  it('GET /api/v1/blocklists/:id/ips returns paginated IPs of a blocklist', async () => {
    await app.seedDb({
      blocklists: [makeBlocklist()],
      blocklistIps: [makeBlocklistIp({ value: '10.0.0.1' }), makeBlocklistIp({ id: 2, value: '10.0.0.3' })],
    });

    const res = await app.request.get('/api/v1/blocklists/1/ips');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });

  it('GET /api/v1/blocklists/:id/ips returns 404 for an unknown blocklist', async () => {
    const res = await app.request.get('/api/v1/blocklists/999/ips');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('POST /api/v1/lists/refresh accepts the refresh-all trigger', async () => {
    const res = await app.request.post('/api/v1/lists/refresh');
    expect(res.status).toBe(202);
    expect(res.body.message).toBe('Blocklist refresh started');
  });
});
