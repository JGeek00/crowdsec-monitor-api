import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateAlerts = vi.hoisted(() => vi.fn());

vi.mock('@/services', () => {
  const mockCrowdSecAPI = {
    alerts: { createAlerts: mockCreateAlerts },
    checkBouncerConnection: vi.fn(),
    isBouncerConnected: vi.fn().mockReturnValue(true),
  };
  const mockDatabaseService = { syncAlerts: vi.fn() };
  return { crowdSecAPI: mockCrowdSecAPI, databaseService: mockDatabaseService };
});

vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

const MANUAL_DECISION = vi.hoisted(() => 'crowdsec/manual-decision');
vi.mock('@/constants/scenarios', () => ({ MANUAL_DECISION }));

vi.mock('@/config', () => ({
  config: { crowdsec: { user: 'test-user' } },
}));

import { Request, Response } from 'express';
import { createDecision } from '@/controllers/decisions/create.controller';

describe('createDecision', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { body: { ip: '1.2.3.4', duration: '4h', reason: 'test', type: 'ban' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 201 on successful creation', async () => {
    mockCreateAlerts.mockResolvedValue([1]);
    await createDecision(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(201);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'Decision created successfully' }));
  });

  it('returns 500 when LAPI call fails', async () => {
    mockCreateAlerts.mockRejectedValue(new Error('LAPI error'));
    await createDecision(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });
});
