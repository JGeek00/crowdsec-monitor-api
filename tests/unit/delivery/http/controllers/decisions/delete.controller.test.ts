import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/container', () => ({
  container: {
    useCases: {
      decisions: { deleteDecision: { execute: mockExecute } },
    },
  },
}));

vi.mock('@/infrastructure/system/logger', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import type { DeleteDecisionParams } from '@/delivery/http/contracts';
import { deleteDecision } from '@/delivery/http/controllers/decisions/delete.controller';
import { NotFoundError } from '@/domain/errors';

describe('deleteDecision', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: { id: '1' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 200 on successful deletion', async () => {
    mockExecute.mockResolvedValue({ nbDeleted: 1 });
    await deleteDecision(req as unknown as Request<DeleteDecisionParams>, res as Response);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'DecisionsTable deleted successfully' }));
  });

  it('returns 404 when not found', async () => {
    mockExecute.mockRejectedValue(new NotFoundError('DecisionsTable with ID 1 was not found'));
    await deleteDecision(req as unknown as Request<DeleteDecisionParams>, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
  });

  it('returns 400 for invalid ID', async () => {
    req.params = { id: 'abc' };
    await deleteDecision(req as unknown as Request<DeleteDecisionParams>, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('returns 500 on LAPI failure', async () => {
    mockExecute.mockRejectedValue(new Error('LAPI error'));
    await deleteDecision(req as unknown as Request<DeleteDecisionParams>, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
