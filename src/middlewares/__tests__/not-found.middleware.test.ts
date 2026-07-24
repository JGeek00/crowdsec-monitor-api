import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

import { notFoundHandler } from '@/middlewares/not-found.middleware';

describe('notFoundHandler', () => {
  it('returns 404 with ErrorResponse shape', () => {
    const jsonSpy = vi.fn();
    const statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    const req = {} as Request;
    const res = { status: statusSpy } as unknown as Response;

    notFoundHandler(req, res, vi.fn() as NextFunction);

    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Not found', message: 'Endpoint not found' }),
    );
  });
});
