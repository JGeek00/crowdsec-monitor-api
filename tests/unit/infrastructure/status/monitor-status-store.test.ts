import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatusService } from '@/infrastructure/status/monitor-status-store';

const CANONICAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

describe('StatusService (monitor status store)', () => {
  let service: StatusService;

  beforeEach(() => {
    service = new StatusService();
  });

  it('exposes the initial snapshot with defaults', () => {
    const snapshot = service.getStatusSnapshot();
    expect(snapshot.csLapi.lapiConnected).toBe(false);
    expect(snapshot.csLapi.lastSuccessfulSync).toBeNull();
    expect(snapshot.csBouncer.available).toBe(false);
    expect(snapshot.csMonitorApi.newVersionAvailable).toBeNull();
    expect(snapshot.csLapi.timestamp).toMatch(CANONICAL_PATTERN);
  });

  it('updates lapi status and canonicalizes the sync timestamp', () => {
    service.updateLapiStatus(true, '2026-10-20T18:00:00Z');

    const snapshot = service.getStatusSnapshot();
    expect(snapshot.csLapi.lapiConnected).toBe(true);
    expect(snapshot.csLapi.lastSuccessfulSync).toBe('2026-10-20T18:00:00Z');
    expect(snapshot.csLapi.timestamp).toMatch(CANONICAL_PATTERN);
  });

  it('keeps lastSuccessfulSync null when not provided', () => {
    service.updateLapiStatus(true, null);
    expect(service.getStatusSnapshot().csLapi.lastSuccessfulSync).toBeNull();
  });

  it('updates bouncer and version info', () => {
    service.updateBouncerStatus(true);
    service.updateVersionInfo('9.9.9');

    const snapshot = service.getStatusSnapshot();
    expect(snapshot.csBouncer.available).toBe(true);
    expect(snapshot.csMonitorApi.newVersionAvailable).toBe('9.9.9');
  });

  it('getCleanSnapshot returns empty processes without a provider', () => {
    expect(service.getCleanSnapshot().processes).toEqual([]);
  });

  it('getCleanSnapshot pulls processes from the wired provider', () => {
    service.setProcessSnapshotProvider(() => [{ id: 'p1' } as never]);
    expect(service.getCleanSnapshot().processes).toEqual([{ id: 'p1' }]);
  });

  it('notifies registered listeners debounced on state changes', async () => {
    const cb = vi.fn();
    service.registerStateChangeCallback(cb);

    service.updateBouncerStatus(true);
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);

    // A second mutation in the same tick does not double-broadcast
    service.updateBouncerStatus(false);
    service.notifyChange();
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('does not notify when no listener is registered', async () => {
    service.notifyChange();
    await Promise.resolve();
    expect(true).toBe(true); // no throw
  });
});
