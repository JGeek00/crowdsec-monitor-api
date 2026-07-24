vi.mock('@/config/database', () => {
  const { Sequelize } = require('sequelize');
  const seq = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  return { sequelize: seq, initDatabase: vi.fn().mockResolvedValue(undefined) };
});

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

import { describe, it, expect, vi, afterEach } from 'vitest';
import http from 'http';
import WebSocket from 'ws';
import { WebSocketApp } from '@/sockets';
import { config } from '@/config';

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => resolve((server.address() as any).port));
  });
}

describe('WebSocketApp.setup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the /api/v1/status channel and attaches upgrade handler', () => {
    const wsApp = new WebSocketApp();
    const server = http.createServer();
    wsApp.setup(server);
    expect(server.listeners('upgrade')).toHaveLength(1);
    server.close();
  });

  it('returns 404 for unknown channel', async () => {
    const wsApp = new WebSocketApp();
    const server = http.createServer();
    wsApp.setup(server);
    const port = await listen(server);

    await new Promise<void>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}/api/v1/unknown`);
      ws.on('unexpected-response', (req, res) => {
        expect(res.statusCode).toBe(404);
        ws.close();
        server.close();
        resolve();
      });
      ws.on('error', () => {});
    });
  });

  it('upgrade succeeds for /api/v1/status when no API_PASSWORD', async () => {
    const wsApp = new WebSocketApp();
    const server = http.createServer();
    wsApp.setup(server);
    const port = await listen(server);

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}/api/v1/status`);
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        server.close();
        resolve();
      });
      ws.on('error', reject);
    });
  });

  it('returns 401 when API_PASSWORD is set and no auth header', async () => {
    const orig = config.auth.apiPassword;
    config.auth.apiPassword = 'test-secret';

    const wsApp = new WebSocketApp();
    const server = http.createServer();
    wsApp.setup(server);
    const port = await listen(server);

    await new Promise<void>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}/api/v1/status`);
      ws.on('error', () => {});
      ws.on('unexpected-response', (req, res) => {
        expect(res.statusCode).toBe(401);
        ws.close();
        server.close();
        resolve();
      });
    });
    config.auth.apiPassword = orig;
  });

  it('upgrade succeeds with valid Bearer token when API_PASSWORD is set', async () => {
    const orig = config.auth.apiPassword;
    config.auth.apiPassword = 'valid-token';

    const wsApp = new WebSocketApp();
    const server = http.createServer();
    wsApp.setup(server);
    const port = await listen(server);

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}/api/v1/status`, {
        headers: { Authorization: 'Bearer valid-token' },
      });
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        server.close();
        resolve();
      });
      ws.on('error', reject);
    });
    config.auth.apiPassword = orig;
  });
});
