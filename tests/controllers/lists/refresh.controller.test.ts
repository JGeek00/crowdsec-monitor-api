import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/application/container', () => ({
  container: {
    useCases: {
      blocklists: { refreshAllBlocklists: { execute: mocks.mockExecute } },
    },
  },
}));
vi.mock('@/infrastructure/system/logger', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { refreshLists } from '@/delivery/http/controllers/lists/refresh.controller';
import { ServiceUnavailableError } from '@/domain/errors';

describe('refreshLists', () => {
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 202 on success', async () => {
    mocks.mockExecute.mockResolvedValue(undefined);
    await refreshLists({} as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(202);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'Blocklist refresh started' }));
  });

  it('returns 503 when a blocklist process is already running', async () => {
    mocks.mockExecute.mockRejectedValue(
      new ServiceUnavailableError('A blocklist operation is already in progress. Please try again later.'),
    );
    await refreshLists({} as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(503);
  });
});
