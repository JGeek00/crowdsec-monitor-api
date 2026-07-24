import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models', () => ({
  AlertsTable: {
    findAll: vi.fn(),
    sequelize: { fn: vi.fn(), col: vi.fn() },
    col: { id: 'id' },
  },
  ResponseWithError: {} as any,
  GetTopScenariosResponse: {} as any,
}));
vi.mock('@/utils/request-signal', () => ({
  createRequestSignal: vi.fn(() => ({ signal: { aborted: false }, cleanup: vi.fn() })),
}));
vi.mock('@/utils/error-response', () => ({
  errorResponse: vi.fn((e, m) => ({ error: e, message: m })),
}));

import { Request, Response } from 'express';
import { getTopScenarios } from '@/controllers/statistics/scenarios/list.controller';
import { AlertsTable } from '@/models';

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
    vi.mocked(AlertsTable.findAll).mockResolvedValue([{ scenario: 'ssh-bf', count: '5' }] as any);
    await getTopScenarios(req as Request, res as Response);
    expect(jsonSpy).toHaveBeenCalledWith([{ scenario: 'ssh-bf', amount: 5 }]);
  });

  it('returns 500 on DB error', async () => {
    vi.mocked(AlertsTable.findAll).mockRejectedValue(new Error('DB error'));
    await getTopScenarios(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching scenarios statistics' }));
  });
});
