import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import WebSocket from 'ws';

vi.mock('@/services/status.service', () => ({
  statusService: {
    getCleanSnapshot: vi.fn(() => ({
      csLapi: { lapiConnected: false, lastSuccessfulSync: null, timestamp: new Date().toISOString() },
      csBouncer: { available: false },
      csMonitorApi: { version: '0.0.0', newVersionAvailable: null },
      processes: [],
    })),
    registerStateChangeCallback: vi.fn(),
    updateVersionInfo: vi.fn(),
    updateBouncerStatus: vi.fn(),
    updateLapiStatus: vi.fn(),
    notifyChange: vi.fn(),
  },
}));

vi.mock('@/services/crowdsec-api/base-client.service', () => {
  const MockBaseClient = vi.fn().mockImplementation(() => ({
    client: {
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } },
    },
    token: 'mock-token',
    tokenExpiration: null,
    loginPromise: null,
    bouncerConnected: true,
    lastLapiConnected: true,
    login: vi.fn().mockResolvedValue(true),
    isTokenValid: vi.fn().mockReturnValue(true),
    ensureAuthenticated: vi.fn().mockResolvedValue(true),
    getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer mock-token' }),
    testConnection: vi.fn().mockResolvedValue(true),
    checkStatus: vi.fn().mockResolvedValue(true),
    checkBouncerConnection: vi.fn().mockResolvedValue(undefined),
    isBouncerConnected: vi.fn().mockReturnValue(true),
    setBouncerConnected: vi.fn(),
    getLastLapiConnected: vi.fn().mockReturnValue(true),
    handleError: vi.fn(),
  }));
  return { CrowdSecBaseClient: MockBaseClient };
});

import { setupApp, type TestApp } from '@/__tests__/setup-app';
import { webSocketApp } from '@/sockets';
import { statusService } from '@/services/status.service';

describe('e2e status ws', () => {
  let app: TestApp;
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    app = await setupApp();
    server = http.createServer(app.app).listen(0);
    webSocketApp.setup(server);
    port = (server.address() as any).port;
  });

  afterAll(() => {
    server.close();
    app.closeDb();
  });

  it('GET /api/v1/status returns status snapshot', async () => {
    const res = await app.request.get('/api/v1/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('csMonitorApi');
    expect(res.body).toHaveProperty('csLapi');
    expect(res.body).toHaveProperty('processes');
  });

  it('GET /api/v1/health returns 200', async () => {
    const res = await app.request.get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'API is running');
  });

  it('ws receives snapshot when state changes after connect', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/api/v1/status`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('timeout')), 3000);
    });

    const msgPromise = new Promise<string>((resolve) => ws.once('message', (d) => resolve(d.toString())));
    (statusService.registerStateChangeCallback as any).mock.calls.forEach(([fn]: [() => void]) => fn());
    await new Promise((r) => setTimeout(r, 10));

    const raw = await msgPromise;
    expect(JSON.parse(raw)).toHaveProperty('csMonitorApi');
    ws.close();
  });
});
