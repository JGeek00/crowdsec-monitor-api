import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCheckAllowlist = vi.hoisted(() => vi.fn());

vi.mock('@/services', () => ({
  crowdSecAPI: {
    allowlists: { checkAllowlist: mockCheckAllowlist },
  },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { checkAllowlist } from '@/controllers/lists/allowlists/check.controller';

describe('checkAllowlist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { body: { ips: ['1.2.3.4'] } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 with results', async () => {
    mockCheckAllowlist.mockResolvedValue([{ ip: '1.2.3.4', listed: false }]);
    await checkAllowlist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ results: expect.any(Array) }));
  });

  it('returns 500 on LAPI failure', async () => {
    mockCheckAllowlist.mockRejectedValue(new Error('LAPI error'));
    await checkAllowlist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
