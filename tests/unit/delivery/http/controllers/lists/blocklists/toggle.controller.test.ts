import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/container', () => ({
  container: {
    useCases: {
      blocklists: { toggleBlocklist: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/infrastructure/system/logger', () => ({ log: { error: vi.fn(), warn: vi.fn() } }));

import { Request, Response } from 'express';
import { toggleBlocklist } from '@/delivery/http/controllers/lists/blocklists/toggle.controller';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  UpstreamUnavailableError,
} from '@/domain/errors';

describe('toggleBlocklist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { id: '1' }, body: { enabled: true } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 when enabling a blocklist', async () => {
    mocks.mockExecute.mockResolvedValue({ id: 1, enabled: true });
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(mocks.mockExecute).toHaveBeenCalledWith(1, true);
  });

  it('returns 200 when disabling a blocklist', async () => {
    req.body = { enabled: false };
    mocks.mockExecute.mockResolvedValue({ id: 1, enabled: false });
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(200);
  });

  it('returns 400 when enabled is not a boolean', async () => {
    req.body = { enabled: 'yes' };
    mocks.mockExecute.mockRejectedValue(new ValidationError('"enabled" must be a boolean'));
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 404 when blocklist is not found', async () => {
    mocks.mockExecute.mockRejectedValue(new NotFoundError('BlocklistsTable not found'));
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 503 when blocklist refresh is in progress', async () => {
    mocks.mockExecute.mockRejectedValue(
      new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.'),
    );
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });

  it('returns 409 when blocklist is busy', async () => {
    mocks.mockExecute.mockRejectedValue(
      new ConflictError(
        'A process is already running for this blocklist. Wait for it to complete before performing another action.',
      ),
    );
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(409);
  });

  it('returns 500 when enabling and bouncer is not connected', async () => {
    mocks.mockExecute.mockRejectedValue(
      new UpstreamUnavailableError(
        'Unable to reach CrowdSec LAPI with the configured bouncer key. BlocklistsTable operations are unavailable.',
      ),
    );
    await toggleBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
