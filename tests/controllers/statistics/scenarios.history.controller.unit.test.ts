import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models', () => ({
  AlertsTable: {
    sequelize: { query: vi.fn() },
    col: { id: 'id' },
  },
  ResponseWithError: {} as any,
  ScenarioHistory: {} as any,
  GetScenarioHistoryParams: {} as any,
}));
vi.mock('@/utils/request-signal', () => ({
  createRequestSignal: vi.fn(() => ({ signal: { aborted: false }, cleanup: vi.fn() })),
}));
vi.mock('@/utils/error-response', () => ({
  errorResponse: vi.fn((e, m) => ({ error: e, message: m })),
}));
vi.mock('sequelize', () => ({ QueryTypes: { SELECT: 'SELECT' } }));

import { Request, Response } from 'express';
import { getScenarioHistory } from '@/controllers/statistics/scenarios/history.controller';
import { AlertsTable } from '@/models';

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
    vi.mocked(AlertsTable.sequelize!.query).mockResolvedValue([{ date: '2024-01-01', amount: 5 }] as any);
    await getScenarioHistory(req as Request, res as Response);
    expect(jsonSpy).toHaveBeenCalledWith([{ date: '2024-01-01', amount: 5 }]);
  });

  it('returns 500 on DB error', async () => {
    vi.mocked(AlertsTable.sequelize!.query).mockRejectedValue(new Error('query failed'));
    await getScenarioHistory(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching scenario history' }));
  });
});
