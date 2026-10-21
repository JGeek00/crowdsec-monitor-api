import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mocks = vi.hoisted(() => ({ mockExecute: vi.fn() }));

vi.mock('@/container', () => ({
  container: { useCases: { status: { getStatus: { execute: mocks.mockExecute } } } },
}));

import { getStatus } from '@/delivery/http/controllers/status/status.controller';

describe('getStatus', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy, send: vi.fn() });
    req = {};
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 with snapshot shape', async () => {
    mocks.mockExecute.mockReturnValue({ csMonitorApi: { version: '1.0.0' } });
    await getStatus(req as Request, res as Response);
    expect(res.json).toHaveBeenCalled();
    expect(mocks.mockExecute).toHaveBeenCalled();
  });

  it('returns 500 on error', async () => {
    mocks.mockExecute.mockImplementation(() => {
      throw new Error('fail');
    });
    await getStatus(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
