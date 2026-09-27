import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/services/blocklists/status-blocklist.service', () => ({
  statusBlocklistService: { getProcessesSnapshot: vi.fn() },
}));

describe('StatusService', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('updates LAPI status', async () => {
    const { statusService } = await import('@/services/status.service');
    statusService.updateLapiStatus(true, '2026-07-23T00:00:00Z');
    const snapshot = statusService.getStatusSnapshot();
    expect(snapshot.csLapi.lapiConnected).toBe(true);
    expect(snapshot.csLapi.lastSuccessfulSync).toBe('2026-07-23T00:00:00Z');
  });

  it('updates bouncer status', async () => {
    const { statusService } = await import('@/services/status.service');
    statusService.updateBouncerStatus(true);
    expect(statusService.getStatusSnapshot().csBouncer.available).toBe(true);
  });

  it('updates version info', async () => {
    const { statusService } = await import('@/services/status.service');
    statusService.updateVersionInfo('v2.0.0');
    expect(statusService.getStatusSnapshot().csMonitorApi.newVersionAvailable).toBe('v2.0.0');
  });

  it('registers and triggers state change callback', async () => {
    const { statusService } = await import('@/services/status.service');
    const callback = vi.fn();
    statusService.registerStateChangeCallback(callback);
    statusService.notifyChange();
    await new Promise(process.nextTick);
    expect(callback).toHaveBeenCalled();
  });

  it('getStatusSnapshot returns current state', async () => {
    const { statusService } = await import('@/services/status.service');
    const snapshot = statusService.getStatusSnapshot();
    expect(snapshot).toHaveProperty('csLapi');
    expect(snapshot).toHaveProperty('csBouncer');
    expect(snapshot).toHaveProperty('csMonitorApi');
    expect(snapshot).toHaveProperty('processes');
  });

  it('debounces multiple notifyChange calls', async () => {
    const { statusService } = await import('@/services/status.service');
    const callback = vi.fn();
    statusService.registerStateChangeCallback(callback);

    statusService.notifyChange();
    statusService.notifyChange();
    statusService.notifyChange();
    await new Promise(process.nextTick);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('delivers canonical timestamps in the snapshot (source of the realtime channel)', async () => {
    const { statusService } = await import('@/services/status.service');
    statusService.updateLapiStatus(true, null);
    const snapshot = statusService.getStatusSnapshot();
    expect(snapshot.csLapi.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('keeps lastSuccessfulSync null when never synced', async () => {
    const { statusService } = await import('@/services/status.service');
    statusService.updateLapiStatus(true, null);
    expect(statusService.getStatusSnapshot().csLapi.lastSuccessfulSync).toBeNull();
  });
});
