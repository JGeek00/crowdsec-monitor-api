import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

vi.mock('@/services', () => {
  const mockCrowdSecAPI = {
    decisions: { deleteDecision: vi.fn() },
  };
  const mockDatabaseService = { syncAlerts: vi.fn() };
  return { crowdSecAPI: mockCrowdSecAPI, databaseService: mockDatabaseService };
});

vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

vi.mock('@/models', () => ({
  DecisionsTable: { update: vi.fn().mockResolvedValue([1]) },
  DeleteDecisionParams: {},
  DeleteDecisionResponse: {} as any,
  ResponseWithError: {} as any,
}));

import { deleteDecision } from '@/controllers/decisions/delete.controller';
import { crowdSecAPI } from '@/services';

describe('deleteDecision', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { id: '1' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 on successful deletion', async () => {
    vi.mocked(crowdSecAPI.decisions.deleteDecision).mockResolvedValue(1);
    await deleteDecision(req as Request, res as Response);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'DecisionsTable deleted successfully' }));
  });

  it('returns 404 when not found', async () => {
    vi.mocked(crowdSecAPI.decisions.deleteDecision).mockResolvedValue(0);
    await deleteDecision(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 400 for invalid ID', async () => {
    req.params = { id: 'abc' };
    await deleteDecision(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 500 on LAPI failure', async () => {
    vi.mocked(crowdSecAPI.decisions.deleteDecision).mockRejectedValue(new Error('LAPI error'));
    await deleteDecision(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
