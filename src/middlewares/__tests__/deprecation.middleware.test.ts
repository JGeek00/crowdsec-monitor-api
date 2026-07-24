import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('@/services/log.service', () => ({ log: { warn: vi.fn() } }));

import { deprecate } from '@/middlewares/deprecation.middleware';

describe('deprecation middleware', () => {
  it('sets Deprecation header and calls next', () => {
    const setHeader = vi.fn();
    const req = { method: 'GET', originalUrl: '/api/v1/old-endpoint' } as unknown as Request;
    const res = { setHeader } as unknown as Response;
    const next = vi.fn() as NextFunction;

    const middleware = deprecate('/api/v1/new-endpoint');
    middleware(req, res, next);

    expect(setHeader).toHaveBeenCalledWith('Deprecation', 'true');
    expect(setHeader).toHaveBeenCalledWith('Link', '<' + '/api/v1/new-endpoint' + '>; rel="deprecation"');
    expect(next).toHaveBeenCalled();
  });
});
