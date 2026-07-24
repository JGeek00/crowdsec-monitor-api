import { vi } from 'vitest';
import type { Application } from 'express';
import type { SuperTest, Test } from 'supertest';
import supertest from 'supertest';
import type { Sequelize } from 'sequelize';
import type { Alert, Decision, Blocklist, BlocklistIp, CsBlocklist, UnparsedMetaData } from '@/models';

export interface TestApp {
  app: Application;
  request: SuperTest<Test>;
  sequelize: Sequelize;
  seedDb: (fixtures: {
    alerts?: Alert<UnparsedMetaData>[];
    decisions?: Decision[];
    blocklists?: Blocklist[];
    blocklistIps?: BlocklistIp[];
    csBlocklists?: CsBlocklist[];
  }) => Promise<void>;
  closeDb: () => Promise<void>;
}

// ponytail: shared ref so vi.mock factory can create and tests can access the in-memory sequelize
const sequelizeRef = vi.hoisted(() => ({ current: null as any }));

vi.mock('@/config/database', () => {
  const { Sequelize } = require('sequelize');
  const seq = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  });
  sequelizeRef.current = seq;
  return {
    sequelize: seq,
    initDatabase: vi.fn().mockResolvedValue(undefined),
  };
});

// ponytail: mock base-client so CS API calls return empty arrays without network
vi.mock('@/services/crowdsec-api/base-client.service', () => {
  const MockBaseClient = vi.fn().mockImplementation(() => ({
    client: {
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
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

export async function setupApp(): Promise<TestApp> {
  // Set test env before config is read
  process.env.DB_MODE = 'sqlite';
  process.env.CROWDSEC_LAPI_URL = 'http://mock-lapi:8080';
  process.env.CROWDSEC_USER = 'test-user';
  process.env.CROWDSEC_PASSWORD = 'test-pass';
  process.env.CROWDSEC_BOUNCER_KEY = 'test-bouncer-key';
  process.env.BLOCKLIST_BAN_DURATION = '4h';
  process.env.NODE_ENV = 'test';
  process.env.BLOCKLISTS_REFRESH_TIME = '3600';
  process.env.API_PASSWORD = '';
  process.env.DB_PATH = ':memory:';

  const { createApp } = await import('@/app');
  const { AlertsTable, DecisionsTable, BlocklistsTable, BlocklistIpsTable, CsBlocklistsTable } =
    await import('@/models');

  const app = createApp();

  // Sync all models to create tables in the in-memory DB
  await sequelizeRef.current.sync();

  const seedDb = async (fixtures: {
    alerts?: Alert<UnparsedMetaData>[];
    decisions?: Decision[];
    blocklists?: Blocklist[];
    blocklistIps?: BlocklistIp[];
    csBlocklists?: CsBlocklist[];
  }): Promise<void> => {
    if (fixtures.csBlocklists?.length) {
      await CsBlocklistsTable.bulkCreate(fixtures.csBlocklists as any);
    }
    if (fixtures.blocklists?.length) {
      await BlocklistsTable.bulkCreate(fixtures.blocklists as any);
    }
    if (fixtures.alerts?.length) {
      await AlertsTable.bulkCreate(fixtures.alerts as any);
    }
    if (fixtures.decisions?.length) {
      await DecisionsTable.bulkCreate(fixtures.decisions as any);
    }
    if (fixtures.blocklistIps?.length) {
      await BlocklistIpsTable.bulkCreate(fixtures.blocklistIps as any);
    }
  };

  const closeDb = async (): Promise<void> => {
    await sequelizeRef.current?.close();
  };

  return {
    app,
    request: supertest(app),
    sequelize: sequelizeRef.current,
    seedDb,
    closeDb,
  };
}
