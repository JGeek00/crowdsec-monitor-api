import { describe, it, expect, vi } from 'vitest';

const logMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@/infrastructure/system/logger', () => ({
  log: logMocks,
  setLevel: vi.fn(),
}));

import { AppLogger, setAppLogLevel } from '@/infrastructure/system/app-logger';
import { SystemClock } from '@/infrastructure/system/system-clock';

describe('AppLogger', () => {
  const logger = new AppLogger();

  it('delegates every level to the underlying log service', () => {
    logger.error('e', 1);
    logger.warn('w');
    logger.info('i');
    logger.debug('d');

    expect(logMocks.error).toHaveBeenCalledWith('e', 1);
    expect(logMocks.warn).toHaveBeenCalledWith('w');
    expect(logMocks.info).toHaveBeenCalledWith('i');
    expect(logMocks.debug).toHaveBeenCalledWith('d');
  });

  it('re-exports the level setter', () => {
    expect(typeof setAppLogLevel).toBe('function');
  });
});

describe('SystemClock', () => {
  it('returns the current date', () => {
    const before = Date.now();
    const now = new SystemClock().now();
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
  });
});
