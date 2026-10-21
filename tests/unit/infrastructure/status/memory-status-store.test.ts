import { describe, it, expect, vi } from 'vitest';
import { MemoryStatusStore } from '@/infrastructure/status/memory-status-store';

describe('MemoryStatusStore', () => {
  it('returns the snapshot with default state', () => {
    const snapshot = new MemoryStatusStore().getSnapshot();
    expect(snapshot.csLapi.lapiConnected).toBe(false);
    expect(snapshot.csBouncer.available).toBe(false);
    expect(snapshot.processes).toEqual([]);
  });

  it('update methods mutate the snapshot and notify subscribers', async () => {
    const store = new MemoryStatusStore();
    const cb = vi.fn();
    const unsubscribe = store.subscribe(cb);

    store.updateLapi(true, '2026-10-20T18:00:00Z');
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().csLapi.lapiConnected).toBe(true);

    store.updateBouncer(true);
    await Promise.resolve();
    expect(store.getSnapshot().csBouncer.available).toBe(true);

    store.updateVersion('9.9.9');
    await Promise.resolve();
    expect(store.getSnapshot().csMonitorApi.newVersionAvailable).toBe('9.9.9');
    expect(cb).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.updateBouncer(false);
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(3); // no more notifications
  });

  it('debounces notifications within the same microtask window', async () => {
    const store = new MemoryStatusStore();
    const cb = vi.fn();
    store.subscribe(cb);

    store.notifyChange();
    store.notifyChange();
    store.notifyChange();
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
