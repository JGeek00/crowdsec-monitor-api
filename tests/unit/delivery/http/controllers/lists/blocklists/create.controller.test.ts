import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/container', () => ({
  container: {
    useCases: {
      blocklists: { createBlocklist: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/infrastructure/system/logger', () => ({ log: { error: vi.fn(), warn: vi.fn() } }));

import { Request, Response } from 'express';
import { createBlocklist } from '@/delivery/http/controllers/lists/blocklists/create.controller';
import { ValidationError, ConflictError, ServiceUnavailableError, UpstreamUnavailableError } from '@/domain/errors';

describe('createBlocklist', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { body: { url: 'https://example.com/list.txt', name: 'test-list' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 201 on successful creation', async () => {
    mocks.mockExecute.mockResolvedValue({ id: 1, name: 'test-list', url: 'https://example.com/list.txt' });
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(201);
  });

  it('returns 400 when url is missing', async () => {
    req.body = { name: 'test-list' };
    mocks.mockExecute.mockRejectedValue(new ValidationError('url is required'));
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 400 when url is empty string', async () => {
    req.body = { url: '', name: 'test' };
    mocks.mockExecute.mockRejectedValue(new ValidationError('url is required'));
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 400 when name is missing', async () => {
    req.body = { url: 'https://example.com/list.txt' };
    mocks.mockExecute.mockRejectedValue(new ValidationError('name is required'));
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the URL is unsafe', async () => {
    req.body = { url: 'javascript:alert(1)', name: 'test' };
    mocks.mockExecute.mockRejectedValue(new ValidationError('Invalid URL'));
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 409 on duplicate URL', async () => {
    mocks.mockExecute.mockRejectedValue(new ConflictError('A blocklist with this URL already exists'));
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(409);
  });

  it('returns 503 when blocklist refresh is in progress', async () => {
    mocks.mockExecute.mockRejectedValue(
      new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.'),
    );
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });

  it('returns 500 when bouncer is not connected', async () => {
    mocks.mockExecute.mockRejectedValue(
      new UpstreamUnavailableError(
        'Unable to reach CrowdSec LAPI with the configured bouncer key. Blocklist operations are unavailable.',
      ),
    );
    await createBlocklist(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
