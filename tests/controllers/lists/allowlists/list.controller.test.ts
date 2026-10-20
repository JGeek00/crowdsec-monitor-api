import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/application/container', () => ({
  container: {
    useCases: {
      blocklists: { listAllowlists: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { getAllowlists } from '@/delivery/http/controllers/lists/allowlists/list.controller';

describe('getAllowlists', () => {
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

  it('returns 200 with empty data when no allowlists', async () => {
    mocks.mockExecute.mockResolvedValue({ data: [], length: 0 });
    await getAllowlists(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith({ data: [], length: 0 });
  });

  it('returns seeded allowlists', async () => {
    mocks.mockExecute.mockResolvedValue({
      data: [{ name: 'test', description: '', items: [], created_at: '', updated_at: '' }],
      length: 1,
    });
    await getAllowlists(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy.mock.calls[0][0].length).toBe(1);
  });

  it('returns 500 on LAPI failure', async () => {
    mocks.mockExecute.mockRejectedValue(new Error('LAPI error'));
    await getAllowlists(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
