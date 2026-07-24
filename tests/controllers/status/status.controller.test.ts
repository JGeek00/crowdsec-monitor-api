import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mockGetCleanSnapshot = vi.hoisted(() => vi.fn());

vi.mock('@/services', () => ({ statusService: { getCleanSnapshot: mockGetCleanSnapshot } }));

import { getStatus } from '@/controllers/status/status.controller';

describe('getStatus', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy, send: vi.fn() });
    req = {};
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 with snapshot shape', async () => {
    mockGetCleanSnapshot.mockReturnValue({ csMonitorApi: { version: '1.0.0' } });
    await getStatus(req as Request, res as Response);
    expect(res.json).toHaveBeenCalled();
    expect(mockGetCleanSnapshot).toHaveBeenCalled();
  });

  it('returns 500 on error', async () => {
    mockGetCleanSnapshot.mockImplementation(() => {
      throw new Error('fail');
    });
    await getStatus(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
