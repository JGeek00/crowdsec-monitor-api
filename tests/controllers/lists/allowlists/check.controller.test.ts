import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/application/container', () => ({
  container: {
    useCases: {
      blocklists: { checkAllowlist: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { checkAllowlist } from '@/delivery/http/controllers/lists/allowlists/check.controller';

describe('checkAllowlist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { body: { ips: ['1.2.3.4'] } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 with results', async () => {
    mocks.mockExecute.mockResolvedValue([{ ip: '1.2.3.4', allowlist: null }]);
    await checkAllowlist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ results: [{ ip: '1.2.3.4', allowlist: null }] }));
  });

  it('returns 500 on LAPI failure', async () => {
    mocks.mockExecute.mockRejectedValue(new Error('LAPI error'));
    await checkAllowlist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
