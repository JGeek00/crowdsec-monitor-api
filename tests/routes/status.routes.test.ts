import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupApp, type TestApp } from '@tests/setup-app';

vi.mock('@/services/status.service', () => ({
  statusService: {
    getCleanSnapshot: vi.fn(() => ({
      csLapi: { lapiConnected: false, lastSuccessfulSync: null, timestamp: new Date().toISOString() },
      csBouncer: { available: false },
      csMonitorApi: { version: '0.0.0', newVersionAvailable: null },
      processes: [],
    })),
  },
}));

describe('status routes', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await setupApp();
  });
  afterAll(async () => {
    await app.closeDb();
  });

  it('GET /api/v1/health returns 200', async () => {
    const res = await app.request.get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'API is running');
  });

  it('GET /api/v1/status returns 200', async () => {
    const res = await app.request.get('/api/v1/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('csMonitorApi');
  });

  it('GET /api/v1/check-credentials returns 200', async () => {
    const res = await app.request.get('/api/v1/check-credentials');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Credentials are valid');
  });
});
