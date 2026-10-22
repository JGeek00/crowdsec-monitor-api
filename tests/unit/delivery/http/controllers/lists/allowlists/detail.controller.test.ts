import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/container', () => ({
  container: {
    useCases: {
      blocklists: { getAllowlist: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/infrastructure/system/logger', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import type { GetAllowlistParams } from '@/delivery/http/contracts';
import { getAllowlistByName } from '@/delivery/http/controllers/lists/allowlists/detail.controller';
import { NotFoundError } from '@/domain/errors';

describe('getAllowlistByName', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { allowlist_name: 'test-allowlist' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 when allowlist is found', async () => {
    mocks.mockExecute.mockResolvedValue({ name: 'test-allowlist', items: [] });
    await getAllowlistByName(req as unknown as Request<GetAllowlistParams>, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'test-allowlist', items: [] } }));
  });

  it('returns 404 when allowlist is not found', async () => {
    mocks.mockExecute.mockRejectedValue(new NotFoundError("Allowlist 'test-allowlist' was not found"));
    await getAllowlistByName(req as unknown as Request<GetAllowlistParams>, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 500 on LAPI failure', async () => {
    mocks.mockExecute.mockRejectedValue(new Error('LAPI error'));
    await getAllowlistByName(req as unknown as Request<GetAllowlistParams>, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
