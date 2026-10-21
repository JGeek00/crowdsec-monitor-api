import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';
import { makeAlert, makeBlocklist, makeBlocklistIp, makeDecision } from '@tests/setup/factories';

const MCP_PATH = '/mcp';
const JSONRPC_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

const parseMcpBody = (res: { text?: string; body?: unknown }): any => {
  if (res.body && typeof res.body === 'object' && Object.keys(res.body as object).length > 0) {
    return res.body;
  }
  const text = res.text ?? '';
  const dataLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('data: '));
  if (!dataLine) throw new Error(`No JSON-RPC payload in MCP response: ${text.slice(0, 200)}`);
  return JSON.parse(dataLine.slice('data: '.length));
};

const callTool = (app: TestApp, name: string, args: Record<string, unknown> = {}) =>
  app.request
    .post(MCP_PATH)
    .set(JSONRPC_HEADERS)
    .send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
    .then((res) => {
      expect(res.status).toBe(200);
      const payload = parseMcpBody(res);
      expect(payload.error).toBeUndefined();
      return payload.result as { content: { type: string; text: string }[]; isError?: boolean };
    });

const textOf = (result: { content: { text: string }[] }): any => JSON.parse(result.content[0].text);

describe('MCP tools/call', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM alerts');
    await app.sequelize.query('DELETE FROM decisions');
    await app.sequelize.query('DELETE FROM blocklists');
    await app.sequelize.query('DELETE FROM blocklist_ips');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('get_alerts_stats and list_alerts read seeded alerts', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const stats = textOf(await callTool(app, 'get_alerts_stats'));
    expect(stats.total).toBe(1);
    const list = textOf(await callTool(app, 'list_alerts', { limit: 10 }));
    expect(list.items).toHaveLength(1);
    const unpaged = textOf(await callTool(app, 'list_alerts', { unpaged: true }));
    expect(unpaged.total).toBe(1);
  });

  it('list_alerts rejects an offset beyond the total as a JSON-RPC error', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const res = await app.request
      .post(MCP_PATH)
      .set(JSONRPC_HEADERS)
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_alerts', arguments: { offset: 99 } } });
    expect(res.status).toBe(200);
    expect(parseMcpBody(res).result.isError).toBe(true);
  });

  it('get_alert returns the alert with decisions; unknown id is an isError result', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 7 })], decisions: [makeDecision({ id: 9, alert_id: 7 })] });
    const found = textOf(await callTool(app, 'get_alert', { id: 7 }));
    expect(found.decisions).toHaveLength(1);
    const missing = await callTool(app, 'get_alert', { id: 999 });
    expect(missing.isError).toBe(true);
  });

  it('get_statistics and get_top_countries aggregate seeded alerts', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const general = textOf(await callTool(app, 'get_statistics'));
    expect(general).toHaveProperty('alertsLast24Hours');
    expect(general).toHaveProperty('topCountries');
    const countries = textOf(await callTool(app, 'get_top_countries'));
    expect(countries[0]).toHaveProperty('countryCode');
  });

  it('get_country_history returns history rows for a seeded country', async () => {
    await app.seedDb({ alerts: [makeAlert()] });
    const history = textOf(await callTool(app, 'get_country_history', { country: 'us' }));
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]).toHaveProperty('date');
  });

  it('list_decisions, get_decision and get_decisions_stats read seeded decisions', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 3 })], decisions: [makeDecision({ id: 5, alert_id: 3 })] });
    const list = textOf(await callTool(app, 'list_decisions', { limit: 10 }));
    expect(list.items).toHaveLength(1);
    const detail = textOf(await callTool(app, 'get_decision', { id: 5 }));
    expect(detail.id).toBe(5);
    const stats = textOf(await callTool(app, 'get_decisions_stats'));
    expect(stats.total).toBe(1);
  });

  it('list_decisions_by_ip and get_decision_by_ip group by IP', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 3 })],
      decisions: [makeDecision({ id: 5, alert_id: 3, expiration: new Date('2027-01-01T00:00:00Z') })],
    });
    const grouped = textOf(await callTool(app, 'list_decisions_by_ip', { limit: 10 }));
    expect(grouped.groups).toHaveLength(1);
    expect(grouped.groups[0].ip).toBe('1.2.3.4');
    const byIp = textOf(await callTool(app, 'get_decision_by_ip', { ip: '1.2.3.4' }));
    expect(byIp.decisions).toHaveLength(1);
    const activeOnly = textOf(await callTool(app, 'get_decision_by_ip', { ip: '1.2.3.4', only_active: true }));
    expect(activeOnly.decisions).toHaveLength(1);
  });

  it('list_blocklists, get_blocklist and get_blocklist_ips read seeded blocklists', async () => {
    await app.seedDb({ blocklists: [makeBlocklist()], blocklistIps: [makeBlocklistIp()] });
    const list = textOf(await callTool(app, 'list_blocklists', { unpaged: true }));
    expect(list.items).toHaveLength(1);
    const detail = textOf(await callTool(app, 'get_blocklist', { id: '1' }));
    expect(detail.data.id).toBe('1');
    const withIps = textOf(await callTool(app, 'get_blocklist', { id: '1', include_ips: 'full' }));
    expect(withIps.data.blocklistIps).toHaveLength(1);
    const withIpStrings = textOf(await callTool(app, 'get_blocklist', { id: '1', include_ips: 'ip_string' }));
    expect(withIpStrings.data.blocklistIps).toEqual(['10.0.0.1']);
    const ips = textOf(await callTool(app, 'get_blocklist_ips', { id: '1', unpaged: true }));
    expect(ips.items).toHaveLength(1);
    const ipStrings = textOf(await callTool(app, 'get_blocklist_ips', { id: '1', unpaged: true, ip_string: true }));
    expect(ipStrings.items).toEqual(['10.0.0.1']);
  });

  it('list_allowlists returns the LAPI allowlists; unknown allowlist is an isError result', async () => {
    const list = textOf(await callTool(app, 'list_allowlists'));
    expect(list).toHaveProperty('data');
    expect(list).toHaveProperty('length');
    const missing = await callTool(app, 'get_allowlist', { allowlist_name: 'no-such-list' });
    expect(missing.isError).toBe(true);
  });

  it('rejects invalid tool arguments with an isError result', async () => {
    const res = await app.request
      .post(MCP_PATH)
      .set(JSONRPC_HEADERS)
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_alert', arguments: {} } });
    expect(res.status).toBe(200);
    const payload = parseMcpBody(res);
    expect(payload.error).toBeUndefined();
    expect(payload.result.isError).toBe(true);
    expect(payload.result.content[0].text).toContain('get_alert');
  });
});
