import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { validationResult } from 'express-validator';

describe('handleValidationErrors', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let nextSpy: ReturnType<typeof vi.fn>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    nextSpy = vi.fn();
    req = {};
    res = { status: statusSpy, json: jsonSpy } as unknown as Response;
  });

  it('calls next when validation passes', () => {
    vi.mocked(validationResult).mockReturnValue({ isEmpty: () => true } as any);
    handleValidationErrors(req as Request, res as Response, nextSpy);
    expect(nextSpy).toHaveBeenCalled();
  });

  it('returns 400 when validation fails', () => {
    vi.mocked(validationResult).mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid value' }],
    } as any);
    handleValidationErrors(req as Request, res as Response, nextSpy);
    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation error', message: 'Invalid value' }),
    );
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('joins multiple error messages', () => {
    vi.mocked(validationResult).mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'First error' }, { msg: 'Second error' }],
    } as any);
    handleValidationErrors(req as Request, res as Response, nextSpy);
    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'First error, Second error' }));
  });
});
