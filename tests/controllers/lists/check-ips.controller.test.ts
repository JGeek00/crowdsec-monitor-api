import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLookupIpsInBlocklists, mockLookupIpsInAllowlists } = vi.hoisted(() => ({
  mockLookupIpsInBlocklists: vi.fn(),
  mockLookupIpsInAllowlists: vi.fn(),
}));

vi.mock('@/utils/blocklist-lookup', () => ({ lookupIpsInBlocklists: mockLookupIpsInBlocklists }));
vi.mock('@/utils/allowlist-lookup', () => ({ lookupIpsInAllowlists: mockLookupIpsInAllowlists }));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { checkIpsInList } from '@/controllers/lists/check-ips.controller';

describe('checkIpsInList', () => {
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

  it('returns 200 with blocklist and allowlist results', async () => {
    mockLookupIpsInBlocklists.mockResolvedValue(new Map());
    mockLookupIpsInAllowlists.mockResolvedValue(new Map());
    await checkIpsInList(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ results: expect.any(Array) }));
  });

  it('returns 400 when ips is not an array', async () => {
    req.body = { ips: 'not-an-array' };
    await checkIpsInList(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 400 when ips contains invalid IPs', async () => {
    req.body = { ips: ['not-an-ip'] };
    await checkIpsInList(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });
});
