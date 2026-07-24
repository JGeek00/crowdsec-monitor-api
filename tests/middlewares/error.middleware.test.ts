import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('@/services/log.service', () => ({ log: { error: vi.fn() } }));

import { errorHandler } from '@/middlewares/error.middleware';

describe('errorHandler', () => {
  it('returns 500 with error message', () => {
    const jsonSpy = vi.fn();
    const statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    const req = {} as Request;
    const res = { status: statusSpy } as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(new Error('Something broke'), req, res, next);

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error', message: 'Something broke' }),
    );
  });
});
