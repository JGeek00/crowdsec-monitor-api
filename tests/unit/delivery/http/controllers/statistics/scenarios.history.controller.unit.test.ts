import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ mockExecute: vi.fn() }));

vi.mock('@/container', () => ({
  container: { useCases: { statistics: { getScenarioHistory: { execute: mocks.mockExecute } } } },
}));
vi.mock('@/delivery/http/request-signal', () => ({
  createRequestSignal: vi.fn(function () {
    return { signal: { aborted: false }, cleanup: vi.fn() };
  }),
}));
vi.mock('@/delivery/http/error-response', () => ({
  errorResponse: vi.fn((e, m) => ({ error: e, message: m })),
}));

import { Request, Response } from 'express';
import { getScenarioHistory } from '@/delivery/http/controllers/statistics/scenarios/history.controller';

describe('getScenarioHistory unit', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { item: 'ssh-bf' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 with history', async () => {
    mocks.mockExecute.mockResolvedValue([{ date: '2024-01-01', amount: 5 }]);
    await getScenarioHistory(req as Request, res as Response);
    expect(jsonSpy).toHaveBeenCalledWith([{ date: '2024-01-01', amount: 5 }]);
  });

  it('returns 500 on DB error', async () => {
    mocks.mockExecute.mockRejectedValue(new Error('query failed'));
    await getScenarioHistory(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching scenario history' }));
  });
});
