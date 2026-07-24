import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindAll } = vi.hoisted(() => ({ mockFindAll: vi.fn() }));

vi.mock('@/models/db', () => ({ AlertsTable: { findAll: mockFindAll } }));
vi.mock('@/models', () => ({
  AlertsTable: {
    findAll: mockFindAll,
    col: { crowdsecCreatedAt: 'crowdsec_created_at', source: 'source', events: 'events' },
  },
  ResponseWithError: {} as any,
}));
vi.mock('@/utils/request-signal', () => ({
  createRequestSignal: vi.fn(() => ({ signal: { aborted: false }, cleanup: vi.fn() })),
}));
vi.mock('@/utils/error-response', () => ({
  errorResponse: vi.fn((e, m) => ({ error: e, message: m })),
}));

import { Request, Response } from 'express';
import { getTopCountries } from '@/controllers/statistics/countries/list.controller';
import { getCountryHistory } from '@/controllers/statistics/countries/history.controller';
import { getTopIpOwners } from '@/controllers/statistics/ip-owners/list.controller';
import { getIpOwnerHistory } from '@/controllers/statistics/ip-owners/history.controller';
import { getTopTargets } from '@/controllers/statistics/targets/list.controller';
import { getTargetHistory } from '@/controllers/statistics/targets/history.controller';

describe('statistics controllers - error paths', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = { params: {} };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('getTopCountries returns 500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('db error'));
    await getTopCountries(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching countries statistics' }));
  });

  it('getCountryHistory returns 500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('db error'));
    req = { params: { item: 'US' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
    await getCountryHistory(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching country history' }));
  });

  it('getTopIpOwners returns 500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('db error'));
    await getTopIpOwners(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching IP owners statistics' }));
  });

  it('getIpOwnerHistory returns 500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('db error'));
    req = { params: { item: 'Example-AS' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
    await getIpOwnerHistory(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching IP owner history' }));
  });

  it('getTopTargets returns 500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('db error'));
    await getTopTargets(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching targets statistics' }));
  });

  it('getTargetHistory returns 500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('db error'));
    req = { params: { item: 'example.com' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
    await getTargetHistory(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching target history' }));
  });
});
