import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@/application/container', () => ({
  container: {
    useCases: {
      decisions: { createDecision: { execute: mockExecute } },
    },
  },
}));

import { Request, Response } from 'express';
import { createDecision } from '@/controllers/decisions/create.controller';
import { CreateDecisionUseCase } from '@/application/use-cases/decisions/create-decision.usecase';

describe('createDecision', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { body: { ip: '1.2.3.4', duration: '4h', reason: 'test', type: 'ban' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('returns 201 on successful creation', async () => {
    mockExecute.mockResolvedValue({ message: 'Decision created successfully', alert_ids: [1], decision: {} });
    await createDecision(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(201);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'Decision created successfully' }));
  });

  it('returns 500 when LAPI call fails', async () => {
    mockExecute.mockRejectedValue(new Error('LAPI error'));
    await createDecision(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
  });

  it('sends RFC 3339 ISO timestamps to the CrowdSec LAPI (upstream contract stays ISO)', async () => {
    const mockCreateAlerts = vi.fn().mockResolvedValue([1]);
    const useCase = new CreateDecisionUseCase({
      lapiClient: { createAlerts: mockCreateAlerts } as never,
      syncAlerts: { execute: vi.fn() } as never,
    });

    await useCase.execute({ ip: '1.2.3.4', duration: '4h', reason: 'test', type: 'ban' });

    const payload = mockCreateAlerts.mock.calls[0][0];
    expect(payload[0].start_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
    expect(payload[0].stop_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
  });
});
