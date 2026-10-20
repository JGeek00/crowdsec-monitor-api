import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/application/container', () => ({
  container: {
    useCases: {
      blocklists: { checkDomain: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/infrastructure/system/logger', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { checkDomainBlocklist } from '@/delivery/http/controllers/lists/blocklists/check-domain.controller';

describe('checkDomainBlocklist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { body: { domain: 'example.com' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 with domain results', async () => {
    mocks.mockExecute.mockResolvedValue({ domain: 'example.com', ips: [{ ip: '1.2.3.4', blocklists: [] }] });
    await checkDomainBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ domain: 'example.com' }));
  });

  it('returns 422 when domain cannot be resolved', async () => {
    mocks.mockExecute.mockResolvedValue({ unresolvable: true });
    await checkDomainBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(422);
  });

  it('returns 500 when lookup fails', async () => {
    mocks.mockExecute.mockRejectedValue(new Error('DB error'));
    await checkDomainBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });

  it('returns 500 when DNS resolution throws', async () => {
    mocks.mockExecute.mockRejectedValue(new Error('DNS timeout'));
    await checkDomainBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
