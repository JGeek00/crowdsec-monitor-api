import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/application/container', () => ({
  container: {
    useCases: {
      alerts: { deleteAlert: { execute: mockExecute } },
    },
  },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { Request, Response } from 'express';
import { deleteAlert } from '@/delivery/http/controllers/alerts/delete.controller';
import { NotFoundError } from '@/domain/errors';

describe('deleteAlert unit', () => {
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

  it('returns 400 for invalid ID', async () => {
    req.params = { id: 'abc' };
    await deleteAlert(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid alert ID' }));
  });

  it('returns 404 when LAPI returns 0', async () => {
    mockExecute.mockRejectedValue(new NotFoundError('Alert with ID 1 was not found'));
    await deleteAlert(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Alert not found' }));
  });

  it('returns 200 on successful delete and syncs', async () => {
    mockExecute.mockResolvedValue({ nbDeleted: 1 });
    await deleteAlert(req as Request, res as Response);
    expect(mockExecute).toHaveBeenCalledWith(1);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'Alert deleted successfully' }));
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ nbDeleted: '1' }));
  });

  it('returns 404 on LAPI 404 error', async () => {
    const lapiError = Object.assign(new Error('Not found'), { response: { status: 404 } });
    mockExecute.mockRejectedValue(lapiError);
    await deleteAlert(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Alert not found' }));
  });

  it('returns 500 on generic LAPI error', async () => {
    mockExecute.mockRejectedValue(new Error('LAPI down'));
    await deleteAlert(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to delete alert' }));
  });
});
