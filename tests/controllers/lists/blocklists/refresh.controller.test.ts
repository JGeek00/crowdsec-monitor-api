import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/container', () => ({
  container: {
    useCases: {
      blocklists: { refreshSingleBlocklist: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/infrastructure/system/logger', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { refreshSingleBlocklist } from '@/delivery/http/controllers/lists/blocklists/refresh.controller';
import { NotFoundError, ConflictError, ServiceUnavailableError } from '@/domain/errors';

describe('refreshSingleBlocklist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { id: '1' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 202 on success', async () => {
    mocks.mockExecute.mockResolvedValue(undefined);
    await refreshSingleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(202);
  });

  it('returns 404 when blocklist is not found', async () => {
    mocks.mockExecute.mockRejectedValue(new NotFoundError('Blocklist not found'));
    await refreshSingleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 503 when already syncing', async () => {
    mocks.mockExecute.mockRejectedValue(
      new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.'),
    );
    await refreshSingleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });

  it('returns 409 when blocklist is busy', async () => {
    mocks.mockExecute.mockRejectedValue(
      new ConflictError(
        'A process is already running for this blocklist. Wait for it to complete before performing another action.',
      ),
    );
    await refreshSingleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(409);
  });
});
