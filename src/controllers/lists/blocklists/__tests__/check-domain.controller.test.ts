import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockLookupIpsInBlocklists: vi.fn(),
  mockResolveIps: vi.fn(),
}));

vi.mock('@/utils/blocklist-lookup', () => ({ lookupIpsInBlocklists: mocks.mockLookupIpsInBlocklists }));
vi.mock('@/utils/dns-resolve', () => ({ resolveIps: mocks.mockResolveIps }));
vi.mock('@/config', () => ({ config: { dns: { server: '1.1.1.1' } } }));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { checkDomainBlocklist } from '@/controllers/lists/blocklists/check-domain.controller';

describe('checkDomainBlocklist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { body: { domain: 'example.com' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 with domain results', async () => {
    mocks.mockResolveIps.mockResolvedValue(['1.2.3.4']);
    mocks.mockLookupIpsInBlocklists.mockResolvedValue(new Map());
    await checkDomainBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ domain: 'example.com' }));
  });

  it('returns 422 when domain cannot be resolved', async () => {
    mocks.mockResolveIps.mockResolvedValue([]);
    await checkDomainBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(422);
  });

  it('returns 500 when lookup fails', async () => {
    mocks.mockResolveIps.mockResolvedValue(['1.2.3.4']);
    mocks.mockLookupIpsInBlocklists.mockRejectedValue(new Error('DB error'));
    await checkDomainBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });

  it('returns 500 when DNS resolution throws', async () => {
    mocks.mockResolveIps.mockRejectedValue(new Error('DNS timeout'));
    await checkDomainBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
