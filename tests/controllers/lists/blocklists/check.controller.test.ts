import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLookupIpsInBlocklists = vi.hoisted(() => vi.fn());

vi.mock('@/utils/blocklist-lookup', () => ({ lookupIpsInBlocklists: mockLookupIpsInBlocklists }));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { checkBlocklist } from '@/controllers/lists/blocklists/check.controller';

describe('checkBlocklist', () => {
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
    mockLookupIpsInBlocklists.mockResolvedValue(new Map());
    await checkBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ results: expect.any(Array) }));
  });

  it('returns 500 on lookup failure', async () => {
    mockLookupIpsInBlocklists.mockRejectedValue(new Error('DB error'));
    await checkBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
