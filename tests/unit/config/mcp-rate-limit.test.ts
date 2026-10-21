import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

const BASE_ENV = {
  DB_MODE: 'sqlite',
  DB_PATH: '/tmp/test.db',
  CROWDSEC_LAPI_URL: 'http://lapi:8080',
  CROWDSEC_USER: 'u',
  CROWDSEC_PASSWORD: 'p',
  CROWDSEC_BOUNCER_KEY: 'bk',
};

describe('config MCP_RATE_LIMIT', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV, ...BASE_ENV };
    delete process.env.RATE_LIMIT;
    delete process.env.MCP_RATE_LIMIT;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('is null when unset, independently from RATE_LIMIT', async () => {
    process.env.RATE_LIMIT = '100/15';
    const { config } = await import('@/config');
    expect(config.rateLimit).toEqual({ max: 100, windowMs: 15 * 60 * 1000 });
    expect(config.mcpRateLimit).toBeNull();
  });

  it('parses MCP_RATE_LIMIT correctly', async () => {
    process.env.MCP_RATE_LIMIT = '50/5';
    const { config } = await import('@/config');
    expect(config.mcpRateLimit).toEqual({ max: 50, windowMs: 5 * 60 * 1000 });
    expect(config.rateLimit).toBeNull();
  });

  it('returns null for an invalid MCP_RATE_LIMIT', async () => {
    process.env.MCP_RATE_LIMIT = 'invalid';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { config } = await import('@/config');
    expect(config.mcpRateLimit).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MCP_RATE_LIMIT'));
    warnSpy.mockRestore();
  });
});
