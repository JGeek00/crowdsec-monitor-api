import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { checkCredentials } from '@/controllers/status/check-credentials.controller';

describe('checkCredentials', () => {
  it('returns 200 with valid message and timestamp', () => {
    const jsonSpy = vi.fn();
    const req = {} as Request;
    const res = { json: jsonSpy } as unknown as Response;
    checkCredentials(req, res);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Credentials are valid', timestamp: expect.any(String) }),
    );
  });
});
