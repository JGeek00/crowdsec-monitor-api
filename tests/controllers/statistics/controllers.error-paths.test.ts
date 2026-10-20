import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTopCountries: vi.fn(),
  getCountryHistory: vi.fn(),
  getTopIpOwners: vi.fn(),
  getIpOwnerHistory: vi.fn(),
  getTopTargets: vi.fn(),
  getTargetHistory: vi.fn(),
}));

vi.mock('@/application/container', () => ({
  container: {
    useCases: {
      statistics: {
        getTopCountries: { execute: mocks.getTopCountries },
        getCountryHistory: { execute: mocks.getCountryHistory },
        getTopIpOwners: { execute: mocks.getTopIpOwners },
        getIpOwnerHistory: { execute: mocks.getIpOwnerHistory },
        getTopTargets: { execute: mocks.getTopTargets },
        getTargetHistory: { execute: mocks.getTargetHistory },
      },
    },
  },
}));
vi.mock('@/utils/request-signal', () => ({
  createRequestSignal: vi.fn(function () {
    return { signal: { aborted: false }, cleanup: vi.fn() };
  }),
}));
vi.mock('@/utils/error-response', () => ({
  errorResponse: vi.fn((e, m) => ({ error: e, message: m })),
}));

import { Request, Response } from 'express';
import { getTopCountries } from '@/delivery/http/controllers/statistics/countries/list.controller';
import { getCountryHistory } from '@/delivery/http/controllers/statistics/countries/history.controller';
import { getTopIpOwners } from '@/delivery/http/controllers/statistics/ip-owners/list.controller';
import { getIpOwnerHistory } from '@/delivery/http/controllers/statistics/ip-owners/history.controller';
import { getTopTargets } from '@/delivery/http/controllers/statistics/targets/list.controller';
import { getTargetHistory } from '@/delivery/http/controllers/statistics/targets/history.controller';

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
    mocks.getTopCountries.mockRejectedValue(new Error('db error'));
    await getTopCountries(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching countries statistics' }));
  });

  it('getCountryHistory returns 500 on DB error', async () => {
    mocks.getCountryHistory.mockRejectedValue(new Error('db error'));
    req = { params: { item: 'US' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
    await getCountryHistory(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching country history' }));
  });

  it('getTopIpOwners returns 500 on DB error', async () => {
    mocks.getTopIpOwners.mockRejectedValue(new Error('db error'));
    await getTopIpOwners(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching IP owners statistics' }));
  });

  it('getIpOwnerHistory returns 500 on DB error', async () => {
    mocks.getIpOwnerHistory.mockRejectedValue(new Error('db error'));
    req = { params: { item: 'Example-AS' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
    await getIpOwnerHistory(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching IP owner history' }));
  });

  it('getTopTargets returns 500 on DB error', async () => {
    mocks.getTopTargets.mockRejectedValue(new Error('db error'));
    await getTopTargets(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching targets statistics' }));
  });

  it('getTargetHistory returns 500 on DB error', async () => {
    mocks.getTargetHistory.mockRejectedValue(new Error('db error'));
    req = { params: { item: 'example.com' } };
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
    await getTargetHistory(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error fetching target history' }));
  });
});
