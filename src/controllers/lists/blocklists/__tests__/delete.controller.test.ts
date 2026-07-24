import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockIsSyncing: vi.fn().mockReturnValue(false),
  mockIsBlocklistBusy: vi.fn().mockReturnValue(false),
  mockFindByPk: vi.fn(),
  mockBlocklistIpsCount: vi.fn().mockResolvedValue(0),
}));

vi.mock('@/services', () => ({
  statusBlocklistService: {
    isSyncingBlocklists: mocks.mockIsSyncing,
    isBlocklistBusy: mocks.mockIsBlocklistBusy,
    createBlocklistDeleteProcess: vi.fn(),
    completeProcess: vi.fn(),
  },
  databaseService: { deleteBlocklistAlerts: vi.fn() },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));
vi.mock('@/models', () => ({
  BlocklistsTable: { findByPk: mocks.mockFindByPk },
  BlocklistIpsTable: { count: mocks.mockBlocklistIpsCount, col: { blocklistId: 'blocklist_id' } },
  DeleteBlocklistParams: {},
  DeleteBlocklistResponse: {} as any,
  ResponseWithError: {} as any,
}));

import { Request, Response } from 'express';
import { deleteBlocklist } from '@/controllers/lists/blocklists/delete.controller';

describe('deleteBlocklist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { id: '1' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 202 on successful deletion', async () => {
    mocks.mockFindByPk.mockResolvedValue({ id: 1, name: 'test', destroy: vi.fn() });
    await deleteBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(202);
  });

  it('returns 404 when blocklist is not found', async () => {
    mocks.mockFindByPk.mockResolvedValue(null);
    await deleteBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 503 when blocklist refresh is in progress', async () => {
    mocks.mockIsSyncing.mockReturnValue(true);
    await deleteBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });

  it('returns 409 when blocklist is busy', async () => {
    mocks.mockIsSyncing.mockReturnValue(false);
    mocks.mockFindByPk.mockResolvedValue({ id: 1, name: 'test', destroy: vi.fn() });
    mocks.mockIsBlocklistBusy.mockReturnValue(true);
    await deleteBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(409);
  });
});
