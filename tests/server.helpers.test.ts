import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/sockets', () => ({
  webSocketApp: { setup: vi.fn() },
}));

vi.mock('@/services/blocklists/status-blocklist.service', () => ({
  statusBlocklistService: { getProcessesSnapshot: vi.fn(() => []) },
}));

describe('server helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validateEnvironment returns without exiting when env vars are set', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { validateEnvironment } = await import('@/server');
    validateEnvironment();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('formatInterval returns hours', async () => {
    const { formatInterval } = await import('@/server');
    expect(formatInterval(3600)).toBe('1h');
    expect(formatInterval(7200)).toBe('2h');
  });

  it('formatInterval returns minutes', async () => {
    const { formatInterval } = await import('@/server');
    expect(formatInterval(60)).toBe('1m');
    expect(formatInterval(120)).toBe('2m');
  });

  it('formatInterval returns seconds', async () => {
    const { formatInterval } = await import('@/server');
    expect(formatInterval(45)).toBe('45s');
    expect(formatInterval(1)).toBe('1s');
  });

  it('step logs with padded label and status', async () => {
    const { log } = await import('@/services/log.service');
    vi.spyOn(log, 'info').mockImplementation(() => {});

    const { step } = await import('@/server');
    step('Test', '\u2713', 'detail text');
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Test'));
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('\u2713'));
  });

  it('step logs without detail', async () => {
    const { log } = await import('@/services/log.service');
    vi.spyOn(log, 'info').mockImplementation(() => {});

    const { step } = await import('@/server');
    step('Test', '\u2713');
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Test'));
  });
});
