import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockIsSyncing: vi.fn().mockReturnValue(false),
  mockIsBlocklistBusy: vi.fn().mockReturnValue(false),
  mockFindByPk: vi.fn(),
  mockUpdate: vi.fn(),
  mockCheckBouncerConnection: vi.fn(),
  mockIsBouncerConnected: vi.fn().mockReturnValue(true),
}));

vi.mock('@/services', () => ({
  statusBlocklistService: {
    isSyncingBlocklists: mocks.mockIsSyncing,
    isBlocklistBusy: mocks.mockIsBlocklistBusy,
    createBlocklistEnableProcess: vi.fn(),
    createBlocklistDisableProcess: vi.fn(),
    completeProcess: vi.fn(),
  },
  databaseService: { activateBlocklist: vi.fn(), deleteBlocklistAlerts: vi.fn() },
}));
vi.mock('@/services/crowdsec-api.service', () => ({
  crowdSecAPI: {
    checkBouncerConnection: mocks.mockCheckBouncerConnection,
    isBouncerConnected: mocks.mockIsBouncerConnected,
  },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/models', () => ({
  BlocklistsTable: { findByPk: mocks.mockFindByPk },
  BlocklistIpsTable: { count: vi.fn().mockResolvedValue(0) },
}));

import { Request, Response } from 'express';
import { toggleBlocklist } from '@/controllers/lists/blocklists/toggle.controller';

describe('toggleBlocklist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { id: '1' }, body: { enabled: true } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
    // Reset shared mocks
    mocks.mockIsSyncing.mockReturnValue(false);
    mocks.mockIsBlocklistBusy.mockReturnValue(false);
    mocks.mockIsBouncerConnected.mockReturnValue(true);
  });

  it('returns 200 when enabling a blocklist', async () => {
    mocks.mockFindByPk.mockResolvedValue({ id: 1, name: 'test', update: mocks.mockUpdate });
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
  });

  it('returns 200 when disabling a blocklist', async () => {
    mocks.mockFindByPk.mockResolvedValue({ id: 1, name: 'test', update: mocks.mockUpdate });
    req.body = { enabled: false };
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
  });

  it('returns 400 when enabled is not a boolean', async () => {
    req.body = { enabled: 'yes' };
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 404 when blocklist is not found', async () => {
    mocks.mockFindByPk.mockResolvedValue(null);
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 503 when blocklist refresh is in progress', async () => {
    mocks.mockIsSyncing.mockReturnValue(true);
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });

  it('returns 409 when blocklist is busy', async () => {
    mocks.mockIsSyncing.mockReturnValue(false);
    mocks.mockFindByPk.mockResolvedValue({ id: 1, name: 'test', update: mocks.mockUpdate });
    mocks.mockIsBlocklistBusy.mockReturnValue(true);
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(409);
  });

  it('returns 500 when enabling and bouncer is not connected', async () => {
    mocks.mockIsSyncing.mockReturnValue(false);
    mocks.mockFindByPk.mockResolvedValue({ id: 1, name: 'test', update: mocks.mockUpdate });
    mocks.mockCheckBouncerConnection.mockResolvedValue(undefined);
    mocks.mockIsBouncerConnected.mockReturnValue(false);
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
