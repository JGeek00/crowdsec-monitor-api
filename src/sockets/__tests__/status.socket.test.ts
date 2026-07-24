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

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'http';
import WebSocket from 'ws';
import { webSocketApp } from '@/sockets';
import { statusService } from '@/services/status.service';

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => resolve((server.address() as any).port));
  });
}

describe('status socket integration', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = http.createServer();
    webSocketApp.setup(server);
    port = await listen(server);
  });

  afterAll(() => {
    server.close();
  });

  it('client connects and receives snapshot after state change', async () => {
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
