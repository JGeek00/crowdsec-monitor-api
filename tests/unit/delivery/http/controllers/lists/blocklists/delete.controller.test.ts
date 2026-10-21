import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/container', () => ({
  container: {
    useCases: {
      blocklists: { deleteBlocklist: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/infrastructure/system/logger', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { deleteBlocklist } from '@/delivery/http/controllers/lists/blocklists/delete.controller';
import { NotFoundError, ConflictError, ServiceUnavailableError } from '@/domain/errors';

describe('deleteBlocklist', () => {
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

  it('returns 202 on successful deletion', async () => {
    mocks.mockExecute.mockResolvedValue(undefined);
    await deleteBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(202);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'BlocklistsTable deletion requested' }));
  });

  it('returns 404 when blocklist is not found', async () => {
    mocks.mockExecute.mockRejectedValue(new NotFoundError('BlocklistsTable not found'));
    await deleteBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 503 when blocklist refresh is in progress', async () => {
    mocks.mockExecute.mockRejectedValue(
      new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.'),
    );
    await deleteBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });

  it('returns 409 when blocklist is busy', async () => {
    mocks.mockExecute.mockRejectedValue(
      new ConflictError(
        'A process is already running for this blocklist. Wait for it to complete before performing another action.',
      ),
    );
    await deleteBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(409);
  });
});
