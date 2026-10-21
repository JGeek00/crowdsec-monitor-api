import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { config } from '@/config';
import { setupApp, type TestApp } from '@tests/setup/setup-app';

const MCP_PATH = '/mcp';
const JSONRPC_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

/** Extracts the JSON-RPC payload from either a plain-JSON or an SSE (`data: …`) response. */
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

const initializeBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'mcp-test-client', version: '1.0.0' },
  },
};

describe('MCP endpoint (POST /mcp)', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('answers the MCP initialize handshake', async () => {
    const res = await app.request.post(MCP_PATH).set(JSONRPC_HEADERS).send(initializeBody);
    expect(res.status).toBe(200);
    const payload = parseMcpBody(res);
    expect(payload.result).toBeDefined();
    expect(payload.result.serverInfo.name).toBe('crowdsec-monitor');
  });

  it('lists the registered tools', async () => {
    const res = await app.request
      .post(MCP_PATH)
      .set(JSONRPC_HEADERS)
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    expect(res.status).toBe(200);
    const payload = parseMcpBody(res);
    const names = (payload.result.tools as { name: string }[]).map((t) => t.name);
    expect(names).toContain('get_statistics');
    expect(names).toContain('list_alerts');
    expect(names).toContain('list_decisions');
    expect(names).toContain('list_blocklists');
    expect(names).toContain('list_allowlists');
    expect(names).not.toContain('create_notification');
  });

  it('rejects GET and DELETE with 405 (stateless Streamable HTTP)', async () => {
    const getRes = await app.request.get(MCP_PATH);
    expect(getRes.status).toBe(405);
    const deleteRes = await app.request.delete(MCP_PATH);
    expect(deleteRes.status).toBe(405);
  });

  it('enforces Bearer auth when API_PASSWORD is set (same rule as REST)', async () => {
    const previous = config.auth.apiPassword;
    config.auth.apiPassword = 'test-secret';
    try {
      const noAuth = await app.request.post(MCP_PATH).set(JSONRPC_HEADERS).send(initializeBody);
      expect(noAuth.status).toBe(401);

      const wrongToken = await app.request
        .post(MCP_PATH)
        .set({ ...JSONRPC_HEADERS, Authorization: 'Bearer wrong' })
        .send(initializeBody);
      expect(wrongToken.status).toBe(401);

      const ok = await app.request
        .post(MCP_PATH)
        .set({ ...JSONRPC_HEADERS, Authorization: 'Bearer test-secret' })
        .send(initializeBody);
      expect(ok.status).toBe(200);
      expect(parseMcpBody(ok).result.serverInfo.name).toBe('crowdsec-monitor');
    } finally {
      config.auth.apiPassword = previous;
    }
  });
});
