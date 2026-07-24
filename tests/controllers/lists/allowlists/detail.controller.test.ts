import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAllowlistByName = vi.hoisted(() => vi.fn());

vi.mock('@/services', () => ({
  crowdSecAPI: {
    allowlists: { getAllowlistByName: mockGetAllowlistByName },
  },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { getAllowlistByName } from '@/controllers/lists/allowlists/detail.controller';

describe('getAllowlistByName', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { allowlist_name: 'test-list' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 when allowlist is found', async () => {
    mockGetAllowlistByName.mockResolvedValue({
      name: 'test-list',
      description: '',
      items: [],
      created_at: '',
      updated_at: '',
    });
    await getAllowlistByName(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
  });

  it('returns 404 when allowlist is not found', async () => {
    mockGetAllowlistByName.mockResolvedValue(null);
    await getAllowlistByName(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 500 on LAPI failure', async () => {
    mockGetAllowlistByName.mockRejectedValue(new Error('LAPI error'));
    await getAllowlistByName(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
