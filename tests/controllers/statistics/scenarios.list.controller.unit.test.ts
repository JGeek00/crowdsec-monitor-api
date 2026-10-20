import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ mockExecute: vi.fn() }));

vi.mock('@/application/container', () => ({
  container: { useCases: { statistics: { getTopScenarios: { execute: mocks.mockExecute } } } },
}));
vi.mock('@/utils/request-signal', () => ({
  createRequestSignal: vi.fn(function () {
    return { signal: { aborted: false }, cleanup: vi.fn() };
  }),
}));
vi.mock('@/utils/error-response', () => ({
  errorResponse: vi.fn((e, m) => ({ error: e, message: m })),
}));

import { Request, Response } from 'express';
import { getTopScenarios } from '@/controllers/statistics/scenarios/list.controller';

describe('getTopScenarios unit', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = {};
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 with scenarios', async () => {
    mocks.mockExecute.mockResolvedValue([{ scenario: 'ssh-bf', amount: 5 }]);
    await getTopScenarios(req as Request, res as Response);
    expect(jsonSpy).toHaveBeenCalledWith([{ scenario: 'ssh-bf', amount: 5 }]);
  });

  it('returns 500 on DB error', async () => {
    mocks.mockExecute.mockRejectedValue(new Error('DB error'));
    await getTopScenarios(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching scenarios statistics' }));
  });
});
