import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockIsSyncing: vi.fn().mockReturnValue(false),
  mockCheckBouncerConnection: vi.fn(),
  mockIsBouncerConnected: vi.fn().mockReturnValue(true),
  mockFindOne: vi.fn(),
  mockCreate: vi.fn(),
  mockAssertSafeUrl: vi.fn(),
}));

vi.mock('@/services', () => ({
  statusBlocklistService: {
    isSyncingBlocklists: mocks.mockIsSyncing,
    createBlocklistImportProcess: vi.fn(),
    completeProcess: vi.fn(),
  },
  databaseService: { activateBlocklist: vi.fn() },
}));
vi.mock('@/services/crowdsec-api.service', () => ({
  crowdSecAPI: {
    checkBouncerConnection: mocks.mockCheckBouncerConnection,
    isBouncerConnected: mocks.mockIsBouncerConnected,
  },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/utils/url', () => ({ assertSafeUrl: mocks.mockAssertSafeUrl }));
vi.mock('@/models', () => ({
  BlocklistsTable: { findOne: mocks.mockFindOne, create: mocks.mockCreate },
}));

import { Request, Response } from 'express';
import { createBlocklist } from '@/controllers/lists/blocklists/create.controller';

describe('createBlocklist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { body: { url: 'https://example.com/list.txt', name: 'test-list' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
    // Reset shared mocks
    mocks.mockIsSyncing.mockReturnValue(false);
    mocks.mockIsBouncerConnected.mockReturnValue(true);
    mocks.mockFindOne.mockReset();
    mocks.mockCreate.mockReset();
    mocks.mockAssertSafeUrl.mockReset();
  });

  it('returns 201 on successful creation', async () => {
    mocks.mockFindOne.mockResolvedValue(null);
    mocks.mockCreate.mockResolvedValue({ id: 1, name: 'test-list', url: 'https://example.com/list.txt' });
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(201);
  });

  it('returns 400 when url is missing', async () => {
    req.body = { name: 'test-list' };
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 400 when url is empty string', async () => {
    req.body = { url: '', name: 'test' };
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 400 when name is missing', async () => {
    req.body = { url: 'https://example.com/list.txt' };
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 400 when assertSafeUrl throws', async () => {
    mocks.mockAssertSafeUrl.mockImplementation(() => {
      throw new Error('Invalid URL');
    });
    req.body = { url: 'javascript:alert(1)', name: 'test' };
    mocks.mockFindOne.mockResolvedValue(null);
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 409 on duplicate URL', async () => {
    mocks.mockFindOne.mockResolvedValue({ id: 1 });
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(409);
  });

  it('returns 503 when blocklist refresh is in progress', async () => {
    mocks.mockIsSyncing.mockReturnValue(true);
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });

  it('returns 500 when bouncer is not connected', async () => {
    mocks.mockIsSyncing.mockReturnValue(false);
    mocks.mockCheckBouncerConnection.mockResolvedValue(undefined);
    mocks.mockIsBouncerConnected.mockReturnValue(false);
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
