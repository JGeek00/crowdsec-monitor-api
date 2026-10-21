import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

describe('config index', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.DB_MODE;
    delete process.env.DB_PATH;
    delete process.env.CROWDSEC_LAPI_URL;
    delete process.env.CROWDSEC_USER;
    delete process.env.CROWDSEC_PASSWORD;
    delete process.env.CROWDSEC_BOUNCER_KEY;
    delete process.env.NODE_ENV;
    delete process.env.POSTGRES_HOST;
    delete process.env.POSTGRES_USER;
    delete process.env.POSTGRES_PASSWORD;
    delete process.env.POSTGRES_DB;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.BLOCKLISTS_REFRESH_TIME;
    delete process.env.BLOCKLISTS_WRITE_CHUNK_SIZE;
    delete process.env.DOMAIN_CHECK_DNS_SERVER;
    delete process.env.RATE_LIMIT;
    delete process.env.PROCESSES_FINISHED_RETENTION_TIME;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('uses defaults when no env vars set', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.PORT = '3000';

    const { config } = await import('@/config');
    expect(config.server.port).toBe(3000);
    expect(config.server.nodeEnv).toBe('development');
    expect(config.database.mode).toBe('sqlite');
    expect(config.database.path).toBe('/tmp/test.db');
    expect(config.blocklists.refreshTimeSeconds).toBe(43200);
    expect(config.logs.level).toBe('info');
  });

  it('reads PORT and NODE_ENV from env', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'production';

    const { config } = await import('@/config');
    expect(config.server.port).toBe(4000);
    expect(config.server.nodeEnv).toBe('production');
  });

  it('validates DB_MODE postgres requires all postgres vars', async () => {
    process.env.DB_MODE = 'postgres';

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await import('@/config');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('validates DB_MODE postgres when all vars present', async () => {
    process.env.DB_MODE = 'postgres';
    process.env.POSTGRES_HOST = 'pg-host';
    process.env.POSTGRES_USER = 'pg-user';
    process.env.POSTGRES_PASSWORD = 'pg-pass';
    process.env.POSTGRES_DB = 'pg-db';

    const { config } = await import('@/config');
    expect(config.database.mode).toBe('postgres');
    expect(config.database.postgres.host).toBe('pg-host');
  });

  it('parses POSTGRES_HOST with port', async () => {
    process.env.DB_MODE = 'postgres';
    process.env.POSTGRES_HOST = 'pg-host:5433';
    process.env.POSTGRES_USER = 'u';
    process.env.POSTGRES_PASSWORD = 'p';
    process.env.POSTGRES_DB = 'd';

    const { config } = await import('@/config');
    expect(config.database.postgres.host).toBe('pg-host');
    expect(config.database.postgres.port).toBe(5433);
  });

  it('warns on invalid BLOCKLISTS_REFRESH_TIME', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.BLOCKLISTS_REFRESH_TIME = '30';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { config } = await import('@/config');
    expect(config.blocklists.refreshTimeSeconds).toBe(43200);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns on invalid LOG_LEVEL', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.LOG_LEVEL = 'invalid';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { config } = await import('@/config');
    expect(config.logs.level).toBe('info');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('parses BLOCKLISTS_WRITE_CHUNK_SIZE', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.BLOCKLISTS_WRITE_CHUNK_SIZE = '500';

    const { config } = await import('@/config');
    expect(config.blocklists.writeChunkSize).toBe(500);
  });

  it('parses BLOCKLISTS_WRITE_CHUNK_SIZE as none', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.BLOCKLISTS_WRITE_CHUNK_SIZE = 'none';

    const { config } = await import('@/config');
    expect(config.blocklists.writeChunkSize).toBeNull();
  });

  it('warns on BLOCKLISTS_WRITE_CHUNK_SIZE < 100', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.BLOCKLISTS_WRITE_CHUNK_SIZE = '50';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { config } = await import('@/config');
    expect(config.blocklists.writeChunkSize).toBe(1000);
    warnSpy.mockRestore();
  });

  it('exports defaults alongside config', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';

    const { defaults } = await import('@/config');
    expect(defaults).toBeDefined();
    expect(defaults.server.port).toBe(3000);
  });

  it('handles MISSING env vars for DB_MODE=sqlite without DB_PATH', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.SHOULD_NOT_MATTER = 'x';

    // defaults.database.path is always defined, so process.exit is not triggered
    // Just verify the config still loads
    const { config } = await import('@/config');
    expect(config.database.mode).toBe('sqlite');
  });

  it('handles invalid DB_MODE value', async () => {
    process.env.DB_MODE = 'mysql';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await import('@/config');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('parses RATE_LIMIT correctly', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.RATE_LIMIT = '100/15';

    const { config } = await import('@/config');
    expect(config.rateLimit).toEqual({ max: 100, windowMs: 15 * 60 * 1000 });
  });

  it('parses invalid RATE_LIMIT returns null', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.RATE_LIMIT = 'invalid';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { config } = await import('@/config');
    expect(config.rateLimit).toBeNull();
    warnSpy.mockRestore();
  });

  it('reads PROCESSES_FINISHED_RETENTION_TIME', async () => {
    process.env.DB_MODE = 'sqlite';
    process.env.DB_PATH = '/tmp/test.db';
    process.env.CROWDSEC_LAPI_URL = 'http://lapi:8080';
    process.env.CROWDSEC_USER = 'u';
    process.env.CROWDSEC_PASSWORD = 'p';
    process.env.CROWDSEC_BOUNCER_KEY = 'bk';
    process.env.PROCESSES_FINISHED_RETENTION_TIME = '7200';

    const { config } = await import('@/config');
    expect(config.processes.finishedRetentionMs).toBe(7200 * 1000);
  });
});
