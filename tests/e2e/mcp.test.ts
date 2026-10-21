import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupApp, getLapiClientMock, type TestApp } from '@tests/setup/setup-app';
import { makeAlert, makeDecision } from '@tests/setup/factories';

const MCP_PATH = '/mcp';
const JSONRPC_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

/** Full MCP session over Streamable HTTP: initialize → request → parse payload. */
const mcpRequest = async (app: TestApp, method: string, params: Record<string, unknown> = {}, id = 1): Promise<any> => {
  const init = await app.request
    .post(MCP_PATH)
    .set(JSONRPC_HEADERS)
    .send({
      jsonrpc: '2.0',
      id: 'init',
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1.0' } },
    });
  expect(init.status).toBe(200);

  const res = await app.request.post(MCP_PATH).set(JSONRPC_HEADERS).send({ jsonrpc: '2.0', id, method, params });
  expect(res.status).toBe(200);
  const text = res.text ?? '';
  const dataLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('data: '));
  if (!dataLine) throw new Error(`No JSON-RPC payload: ${text.slice(0, 200)}`);
  const payload = JSON.parse(dataLine.slice('data: '.length));
  expect(payload.error).toBeUndefined();
  return payload.result;
};

const callTool = (app: TestApp, name: string, args: Record<string, unknown> = {}): Promise<any> =>
  mcpRequest(app, 'tools/call', { name, arguments: args });

describe('e2e MCP session', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupApp();
  });
  afterEach(async () => {
    await app.sequelize.query('DELETE FROM decisions');
    await app.sequelize.query('DELETE FROM alerts');
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('lists 26 tools with no notification tools', async () => {
    const { tools } = await mcpRequest(app, 'tools/list');
    expect(tools).toHaveLength(26);
    expect(tools.some((tool: { name: string }) => tool.name.includes('notif'))).toBe(false);
  });

  it('creates a decision through the LAPI mock and reads it back', async () => {
    const lapi = getLapiClientMock();
    lapi.client.post.mockResolvedValueOnce({ data: ['42'] });

    const created = await callTool(app, 'create_decision', {
      ip: '203.0.113.10',
      duration: '4h',
      reason: 'manual ban',
      type: 'ban',
    });
    const body = JSON.parse(created.content[0].text);
    expect(body.message).toBe('Decision created successfully');
    expect(body.alert_ids).toEqual(['42']);
  });

  it('deletes a decision through LAPI and expires it locally', async () => {
    await app.seedDb({
      alerts: [makeAlert({ id: 1 })],
      decisions: [makeDecision({ id: 7, alert_id: 1 })],
    });
    const lapi = getLapiClientMock();
    lapi.client.delete.mockResolvedValueOnce({ data: { nbDeleted: '1' } });

    const deleted = await callTool(app, 'delete_decision', { id: 7 });
    expect(JSON.parse(deleted.content[0].text)).toEqual({
      message: 'DecisionsTable deleted successfully',
      nbDeleted: '1',
    });

    const stats = await callTool(app, 'get_decisions_stats');
    expect(JSON.parse(stats.content[0].text).total).toBe(1);
  });

  it('deletes an alert through LAPI and removes it locally', async () => {
    await app.seedDb({ alerts: [makeAlert({ id: 11 })] });
    const lapi = getLapiClientMock();
    lapi.client.delete.mockResolvedValueOnce({ data: { nbDeleted: '1' } });

    const deleted = await callTool(app, 'delete_alert', { id: 11 });
    expect(JSON.parse(deleted.content[0].text)).toEqual({
      message: 'Alert deleted successfully',
      nbDeleted: '1',
    });

    const missing = await callTool(app, 'get_alert', { id: 11 });
    expect(missing.isError).toBe(true);
  });

  it('the legacy /api/v1/mcp path no longer exists', async () => {
    const res = await app.request
      .post('/api/v1/mcp')
      .set(JSONRPC_HEADERS)
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    expect(res.status).toBe(404);
  });
});
