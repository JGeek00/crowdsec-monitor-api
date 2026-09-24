vi.mock('@/config/database', () => {
  const { Sequelize } = require('@sequelize/core');
  const { SqliteDialect } = require('@sequelize/sqlite3');
  const seq = new Sequelize({
    dialect: SqliteDialect,
    storage: ':memory:',
    logging: false,
    // BD temporal: Sequelize v7 exige pool de 1 conexión que nunca se recicle.
    pool: { max: 1, min: 0, idle: Infinity, maxUses: Infinity },
  });
  return { sequelize: seq, initDatabase: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('@/services/status.service', () => ({
  statusService: {
    getCleanSnapshot: vi.fn(function () {
      return {
        csLapi: { lapiConnected: false, lastSuccessfulSync: null, timestamp: new Date().toISOString() },
        csBouncer: { available: false },
        csMonitorApi: { version: '0.0.0', newVersionAvailable: null },
        processes: [],
      };
    }),
    registerStateChangeCallback: vi.fn(),
    updateVersionInfo: vi.fn(),
    updateBouncerStatus: vi.fn(),
    updateLapiStatus: vi.fn(),
    notifyChange: vi.fn(),
  },
}));

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'http';
import WebSocket from 'ws';
import type { WebSocketApp } from '@/sockets';

// NOTE: vitest 5 no comparte las factories de vi.mock con la cadena de imports
// estáticos de '@/sockets' (se evalúan antes de registrar el mock). Hay que
// importarlos dinámicamente dentro de beforeAll.

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => resolve((server.address() as any).port));
  });
}

describe('status socket integration', () => {
  let server: http.Server;
  let port: number;
  let webSocketApp: WebSocketApp;
  let statusService: (typeof import('@/services/status.service'))['statusService'];

  beforeAll(async () => {
    server = http.createServer();
    port = await listen(server);
  });

  afterAll(() => {
    server.close();
  });

  it('client connects and receives snapshot after state change', async () => {
    ({ webSocketApp } = await import('@/sockets'));
    ({ statusService } = await import('@/services/status.service'));
    webSocketApp.setup(server);
    const ws = new WebSocket(`ws://localhost:${port}/api/v1/status`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('timeout')), 3000);
    });

    const msgPromise = new Promise<string>((resolve) => ws.once('message', (d) => resolve(d.toString())));
    const callbacks: (() => void)[] = (statusService.registerStateChangeCallback as any).mock.calls.map(
      (c: any) => c[0],
    );
    callbacks.forEach((fn) => fn());
    await new Promise((r) => setTimeout(r, 10));

    const raw = await msgPromise;
    expect(JSON.parse(raw)).toHaveProperty('csMonitorApi');
    ws.close();
  });

  it('ping/pong keeps connection alive', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/api/v1/status`);
    await new Promise<void>((resolve) => ws.once('open', resolve));

    const pong = new Promise<void>((resolve) => ws.on('pong', () => resolve()));
    ws.ping();
    await expect(pong).resolves.toBeUndefined();
    ws.close();
  });

  it('disconnect removes client from channel', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/api/v1/status`);
    await new Promise<void>((resolve) => ws.once('open', resolve));

    const closed = new Promise<void>((resolve) => ws.on('close', () => resolve()));
    ws.close();
    await expect(closed).resolves.toBeUndefined();
  });
});
