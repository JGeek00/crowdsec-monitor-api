import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockIsAnyRunning = vi.hoisted(() => vi.fn().mockReturnValue(false));
const mockRefreshBlocklists = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/services', () => ({
  statusBlocklistService: { isAnyBlocklistProcessRunning: mockIsAnyRunning },
  databaseService: { refreshBlocklists: mockRefreshBlocklists },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { refreshLists } from '@/controllers/lists/refresh.controller';

describe('refreshLists', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = {};
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 202 on success', async () => {
    await refreshLists(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(202);
  });

  it('returns 503 when a blocklist process is already running', async () => {
    mockIsAnyRunning.mockReturnValue(true);
    await refreshLists(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });
});
