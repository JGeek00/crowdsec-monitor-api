import { describe, it, expect } from 'vitest';

describe('env-defaults', () => {
  it('has server defaults', async () => {
    const { defaults } = await import('@/config/env-defaults');
    expect(defaults.server.port).toBe(3000);
    expect(defaults.server.nodeEnv).toBe('development');
  });

  it('has crowdsec defaults', async () => {
    const { defaults } = await import('@/config/env-defaults');
    expect(defaults.crowdsec.lapiUrl).toBe('http://localhost:8080');
    expect(defaults.crowdsec.user).toBe('');
    expect(defaults.crowdsec.password).toBe('');
  });

  it('has database defaults', async () => {
    const { defaults } = await import('@/config/env-defaults');
    expect(defaults.database.path).toBe('./database/crowdsec.db');
  });

  it('has intervals defaults', async () => {
    const { defaults } = await import('@/config/env-defaults');
    expect(defaults.intervals.alertsSync).toBe(30);
    expect(defaults.intervals.blocklistIpsBanDuration).toBe('24h');
    expect(defaults.intervals.apiBlocklistsRefreshTime).toBe(43200);
  });

  it('has blocklists defaults', async () => {
    const { defaults } = await import('@/config/env-defaults');
    expect(defaults.blocklists.writeChunkSize).toBe(1000);
  });

  it('has logs defaults', async () => {
    const { defaults } = await import('@/config/env-defaults');
    expect(defaults.logs.level).toBe('info');
    expect(defaults.logs.httpRequests).toBe(true);
  });

  it('has processes defaults', async () => {
    const { defaults } = await import('@/config/env-defaults');
    expect(defaults.processes.finishedRetentionTime).toBe(3600);
  });
});
