import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupApp, getLapiClientMock, type TestApp } from '@tests/setup/setup-app';
import { makeAllowlist } from '@tests/setup/factories';

describe('e2e allowlists detail and credentials', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupApp();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/check-credentials validates credentials without side effects', async () => {
    const res = await app.request.get('/api/v1/check-credentials');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Credentials are valid');
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('GET /api/v1/allowlists/:allowlist_name returns the LAPI allowlist without raw content', async () => {
    const lapi = getLapiClientMock();
    lapi.client.get.mockResolvedValueOnce({ data: [makeAllowlist()] });

    const res = await app.request.get('/api/v1/allowlists/test-allowlist');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('test-allowlist');
    expect(res.body.data.description).toBe('Test allowlist');
    // raw content comes through as parsed items
    expect(res.body.data.items[0].value).toBe('192.168.1.1');
  });

  it('GET /api/v1/allowlists/:allowlist_name returns 404 when the allowlist does not exist', async () => {
    const res = await app.request.get('/api/v1/allowlists/unknown-list');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Allowlist not found');
  });
});
