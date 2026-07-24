import { describe, it, expect, vi, afterEach } from 'vitest';

describe('statusBlocklistService', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('isSyncingBlocklists returns false when no processes', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    expect(statusBlocklistService.isSyncingBlocklists()).toBe(false);
  });

  it('isSyncingBlocklists returns true when refresh is active', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);
    expect(statusBlocklistService.isSyncingBlocklists()).toBe(true);
  });

  it('isSyncingBlocklists returns false when completeProcess is called', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);
    statusBlocklistService.completeProcess(id, true);
    expect(statusBlocklistService.isSyncingBlocklists()).toBe(false);
  });

  it('isBlocklistBusy returns true when process is active for that blocklist', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    statusBlocklistService.createBlocklistImportProcess(1, 'test');
    expect(statusBlocklistService.isBlocklistBusy(1)).toBe(true);
    expect(statusBlocklistService.isBlocklistBusy(2)).toBe(false);
  });

  it('isAnyBlocklistProcessRunning returns true when any process active', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    expect(statusBlocklistService.isAnyBlocklistProcessRunning()).toBe(false);
    statusBlocklistService.createBlocklistDisableProcess(10, 1, 'test');
    expect(statusBlocklistService.isAnyBlocklistProcessRunning()).toBe(true);
  });

  it('getProcessesSnapshot returns deep clone of processes', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    statusBlocklistService.createBlocklistImportProcess(1, 'test');
    const snapshot = statusBlocklistService.getProcessesSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).not.toBe(statusBlocklistService.getProcessById(snapshot[0].id));
  });

  it('getProcessById returns undefined for unknown id', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    expect(statusBlocklistService.getProcessById('nope')).toBeUndefined();
  });

  it('markFetched updates process state', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    const id = statusBlocklistService.createBlocklistImportProcess(1, 'test');
    statusBlocklistService.markFetched(id, 'blocklistImport');
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistImport?.fetched).toBe('successful');
  });

  it('completeProcess sets endDatetime and cleans up process', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    const id = statusBlocklistService.createBlocklistImportProcess(1, 'test');
    statusBlocklistService.completeProcess(id, true);
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.endDatetime).toBeTruthy();
    expect(proc?.successful).toBe(true);
  });

  it('setBlocklistStepStatus updates step status in refresh process', async () => {
    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);
    statusBlocklistService.setBlocklistStepStatus(id, 0, 'fetch', 'running');
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistRefresh?.blocklists[0].steps.fetch).toBe('running');
  });
});
