import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockLookupIpsInBlocklists: vi.fn(),
  mockLookupIpsInAllowlists: vi.fn(),
  mockResolveIps: vi.fn(),
}));

vi.mock('@/utils/blocklist-lookup', () => ({ lookupIpsInBlocklists: mocks.mockLookupIpsInBlocklists }));
vi.mock('@/utils/allowlist-lookup', () => ({ lookupIpsInAllowlists: mocks.mockLookupIpsInAllowlists }));
vi.mock('@/utils/dns-resolve', () => ({ resolveIps: mocks.mockResolveIps }));
vi.mock('@/config', () => ({ config: { dns: { server: '1.1.1.1' } } }));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { checkDomainInList } from '@/controllers/lists/check-domain.controller';

describe('checkDomainInList', () => {
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
    mocks.mockLookupIpsInAllowlists.mockResolvedValue(new Map());
    await checkDomainInList(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ domain: 'example.com' }));
  });

  it('returns 422 when domain cannot be resolved', async () => {
    mocks.mockResolveIps.mockResolvedValue([]);
    await checkDomainInList(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(422);
  });

  it('returns 500 on unexpected error', async () => {
    mocks.mockResolveIps.mockRejectedValue(new Error('DNS failure'));
    await checkDomainInList(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to check domain in lists' }));
  });
});
