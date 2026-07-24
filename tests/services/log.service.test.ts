import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('log service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('setLevel throws for invalid level', async () => {
    const { setLevel } = await import('@/services/log.service');
    expect(() => (setLevel as any)('unknown')).toThrow();
  });

  it('debug logs when level is debug', async () => {
    const { setLevel, log } = await import('@/services/log.service');
    setLevel('debug');
    log.debug('test debug');
    expect(console.debug).toHaveBeenCalledWith('test debug');
  });

  it('debug does not log when level is info', async () => {
    const { setLevel, log } = await import('@/services/log.service');
    setLevel('info');
    log.debug('should not show');
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('info logs when level is info', async () => {
    const { setLevel, log } = await import('@/services/log.service');
    setLevel('info');
    log.info('test info');
    expect(console.info).toHaveBeenCalledWith('test info');
  });

  it('warn logs when level is warn', async () => {
    const { setLevel, log } = await import('@/services/log.service');
    setLevel('warn');
    log.warn('test warn');
    expect(console.warn).toHaveBeenCalledWith('test warn');
  });

  it('warn does not log when level is error', async () => {
    const { setLevel, log } = await import('@/services/log.service');
    setLevel('error');
    log.warn('should not show');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('error logs when level is error', async () => {
    const { setLevel, log } = await import('@/services/log.service');
    setLevel('error');
    log.error('test error');
    expect(console.error).toHaveBeenCalledWith('test error');
  });

  it('info does not log when level is error', async () => {
    const { setLevel, log } = await import('@/services/log.service');
    setLevel('error');
    log.info('should not show');
    expect(console.info).not.toHaveBeenCalled();
  });
});
