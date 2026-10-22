import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup/setup-app';

process.env.MCP_RATE_LIMIT = '2/1';

const MCP_PATH = '/mcp';
const JSONRPC_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
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

describe('MCP rate limiting (MCP_RATE_LIMIT)', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterAll(async () => {
    delete process.env.MCP_RATE_LIMIT;
    await app.closeDb();
  });

  it('allows requests within the limit and rejects beyond it, independently from RATE_LIMIT', async () => {
    const first = await app.request.post(MCP_PATH).set(JSONRPC_HEADERS).send(initializeBody);
    expect(first.status).toBe(200);
    const second = await app.request.post(MCP_PATH).set(JSONRPC_HEADERS).send(initializeBody);
    expect(second.status).toBe(200);
    const third = await app.request.post(MCP_PATH).set(JSONRPC_HEADERS).send(initializeBody);
    expect(third.status).toBe(429);

    // The REST API has no limit configured, so it stays open.
    const rest = await app.request.get('/api/v1/alerts');
    expect(rest.status).toBe(200);
  });
});
