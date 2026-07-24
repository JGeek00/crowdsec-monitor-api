import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDeleteAlert, mockSyncAlerts, mockDestroy } = vi.hoisted(() => ({
  mockDeleteAlert: vi.fn(),
  mockSyncAlerts: vi.fn(),
  mockDestroy: vi.fn(),
}));

vi.mock('@/services', () => ({
  crowdSecAPI: {
    alerts: { deleteAlert: mockDeleteAlert },
  },
  databaseService: { syncAlerts: mockSyncAlerts },
}));
vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));
vi.mock('@/models', () => ({
  AlertsTable: { destroy: mockDestroy },
  DeleteAlertParams: {},
  DeleteAlertResponse: {} as any,
  ResponseWithError: {} as any,
}));

import { Request, Response } from 'express';
import { deleteAlert } from '@/controllers/alerts/delete.controller';

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
    mockDeleteAlert.mockResolvedValue(0);
    await deleteAlert(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Alert not found' }));
  });

  it('returns 200 on successful delete and syncs', async () => {
    mockDeleteAlert.mockResolvedValue(1);
    await deleteAlert(req as Request, res as Response);
    expect(mockDestroy).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockSyncAlerts).toHaveBeenCalled();
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'Alert deleted successfully' }));
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ nbDeleted: '1' }));
  });

  it('returns 404 on LAPI 404 error', async () => {
    const lapiError = Object.assign(new Error('Not found'), { response: { status: 404 } });
    mockDeleteAlert.mockRejectedValue(lapiError);
    await deleteAlert(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Alert not found' }));
  });

  it('returns 500 on generic LAPI error', async () => {
    mockDeleteAlert.mockRejectedValue(new Error('LAPI down'));
    await deleteAlert(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to delete alert' }));
  });
});
