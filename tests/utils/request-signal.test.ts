import { describe, it, expect, vi } from 'vitest';
import { createRequestSignal } from '@/utils/request-signal';
import type { Request } from 'express';

function createMockReq(): Partial<Request> {
  const handlers = new Map<string, () => void>();
  return {
    on: vi.fn((event: string, handler: () => void) => {
      handlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      handlers.delete(event);
    }),
    // Store handlers for testing
    _handlers: handlers,
  } as unknown as Partial<Request>;
}

describe('createRequestSignal', () => {
  it('creates a signal and cleanup function', () => {
    const req = createMockReq();
    const { signal, cleanup } = createRequestSignal(req as Request);

    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
    expect(cleanup).toBeInstanceOf(Function);
    expect(req.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('aborts the signal when request closes', () => {
    const req = createMockReq();
    const { signal } = createRequestSignal(req as Request);

    // Simulate the close event
    const closeHandler = (req.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: [string]) => call[0] === 'close',
    )?.[1];
    closeHandler();

    expect(signal.aborted).toBe(true);
  });

  it('cleans up by removing the close listener', () => {
    const req = createMockReq();
    const { cleanup } = createRequestSignal(req as Request);

    cleanup();
    expect(req.off).toHaveBeenCalledWith('close', expect.any(Function));
  });
});
