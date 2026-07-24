import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockIsSyncing: vi.fn().mockReturnValue(false),
  mockIsBlocklistBusy: vi.fn().mockReturnValue(false),
  mockFindByPk: vi.fn(),
}));

vi.mock('@/services', () => ({
  statusBlocklistService: { isSyncingBlocklists: mocks.mockIsSyncing, isBlocklistBusy: mocks.mockIsBlocklistBusy },
  databaseService: { refreshBlocklists: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));
vi.mock('@/models', () => ({
  BlocklistsTable: { findByPk: mocks.mockFindByPk },
  DeleteBlocklistParams: {},
  ResponseWithError: {} as any,
}));

import { Request, Response } from 'express';
import { refreshSingleBlocklist } from '@/controllers/lists/blocklists/refresh.controller';

describe('refreshSingleBlocklist', () => {
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

  it('returns 202 on success', async () => {
    mocks.mockFindByPk.mockResolvedValue({ id: 1, name: 'test' });
    await refreshSingleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(202);
  });

  it('returns 404 when blocklist is not found', async () => {
    mocks.mockFindByPk.mockResolvedValue(null);
    await refreshSingleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 503 when already syncing', async () => {
    mocks.mockIsSyncing.mockReturnValue(true);
    await refreshSingleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });

  it('returns 409 when blocklist is busy', async () => {
    mocks.mockIsSyncing.mockReturnValue(false);
    mocks.mockFindByPk.mockResolvedValue({ id: 1, name: 'test' });
    mocks.mockIsBlocklistBusy.mockReturnValue(true);
    await refreshSingleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(409);
  });
});
