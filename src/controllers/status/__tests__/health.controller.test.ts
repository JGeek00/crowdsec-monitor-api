import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { healthCheck } from '@/controllers/status/health.controller';

describe('healthCheck', () => {
  it('returns 200 with message and timestamp', () => {
    const jsonSpy = vi.fn();
    const req = {} as Request;
    const res = { json: jsonSpy } as unknown as Response;
    healthCheck(req, res);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'API is running', timestamp: expect.any(String) }),
    );
  });
});
