import { describe, it, expect, vi, afterEach } from 'vitest';

describe('statusBlocklistService', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('isSyncingBlocklists returns false when no processes', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    expect(statusBlocklistService.isSyncingBlocklists()).toBe(false);
  });

  it('isSyncingBlocklists returns true when refresh is active', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);
    expect(statusBlocklistService.isSyncingBlocklists()).toBe(true);
  });

  it('isSyncingBlocklists returns false when completeProcess is called', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);
    statusBlocklistService.completeProcess(id, true);
    expect(statusBlocklistService.isSyncingBlocklists()).toBe(false);
  });

  it('isBlocklistBusy returns true when process is active for that blocklist', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    statusBlocklistService.createBlocklistImportProcess(1, 'test');
    expect(statusBlocklistService.isBlocklistBusy(1)).toBe(true);
    expect(statusBlocklistService.isBlocklistBusy(2)).toBe(false);
  });

  it('isAnyBlocklistProcessRunning returns true when any process active', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    expect(statusBlocklistService.isAnyBlocklistProcessRunning()).toBe(false);
    statusBlocklistService.createBlocklistDisableProcess(10, 1, 'test');
    expect(statusBlocklistService.isAnyBlocklistProcessRunning()).toBe(true);
  });

  it('getProcessesSnapshot returns deep clone of processes', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    statusBlocklistService.createBlocklistImportProcess(1, 'test');
    const snapshot = statusBlocklistService.getProcessesSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).not.toBe(statusBlocklistService.getProcessById(snapshot[0].id));
  });

  it('getProcessById returns undefined for unknown id', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    expect(statusBlocklistService.getProcessById('nope')).toBeUndefined();
  });

  it('markFetched updates process state', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistImportProcess(1, 'test');
    statusBlocklistService.markFetched(id, 'blocklistImport');
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistImport?.fetched).toBe('successful');
  });

  it('completeProcess sets endDatetime and cleans up process', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistImportProcess(1, 'test');
    statusBlocklistService.completeProcess(id, true);
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.endDatetime).toBeTruthy();
    expect(proc?.successful).toBe(true);
  });

  it('setBlocklistStepStatus updates step status in refresh process', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);
    statusBlocklistService.setBlocklistStepStatus(id, 0, 'fetch', 'running');
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistRefresh?.blocklists[0].steps.fetch).toBe('running');
  });
});

describe('statusBlocklistService process lifecycle branches', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('createBlocklistEnableProcess registers an enable process without a delete step', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistEnableProcess(3, 'bl-enable');
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistEnable?.blocklistId).toBe(3);
    expect(proc?.blocklistEnable?.deleted).toBeUndefined();
  });

  it('createBlocklistSingleRefreshProcess registers a refresh process with a delete step', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistSingleRefreshProcess(4, 'bl-single');
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistSingleRefresh?.blocklistId).toBe(4);
    expect(proc?.blocklistSingleRefresh?.deleted).toBe('pending');
  });

  it('createBlocklistDeleteProcess registers a delete process with ip counters', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistDeleteProcess(7, 5, 'bl-delete');
    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistDelete).toMatchObject({ blocklistId: 5, blocklistIps: 7 });
  });

  it('setCurrentBlocklist updates the index and ignores unknown processes', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);

    statusBlocklistService.setCurrentBlocklist(id, 0);
    expect(statusBlocklistService.getProcessById(id)?.blocklistRefresh?.currentBlocklist).toBe(0);

    statusBlocklistService.setCurrentBlocklist('nope', 1); // no throw
    expect(statusBlocklistService.isSyncingBlocklists()).toBe(true);
  });

  it('setBlocklistStepStatus ignores out-of-range blocklist indexes', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);

    statusBlocklistService.setBlocklistStepStatus(id, 5, 'fetch', 'running');
    expect(statusBlocklistService.getProcessById(id)?.blocklistRefresh?.blocklists).toHaveLength(1);
  });

  it('addBlocklistIps accumulates totals and ignores unknown processes', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);

    statusBlocklistService.addBlocklistIps(id, 10);
    statusBlocklistService.addBlocklistIps(id, 5);
    expect(statusBlocklistService.getProcessById(id)?.blocklistRefresh?.totalIps).toBe(15);

    statusBlocklistService.addBlocklistIps('nope', 3); // no throw
  });

  it('markParsed routes to import for skip-delete fields and to delete otherwise', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');

    const importId = statusBlocklistService.createBlocklistImportProcess(1, 'bl');
    statusBlocklistService.markFetched(importId, 'blocklistImport');
    statusBlocklistService.markParsed(importId, 'blocklistImport', 42);
    let proc = statusBlocklistService.getProcessById(importId);
    expect(proc?.blocklistImport?.step).toBe('import');
    expect(proc?.blocklistImport?.parsed).toBe('successful');
    expect(proc?.blocklistImport?.processIps.totalIps).toBe(42);

    const refreshId = statusBlocklistService.createBlocklistSingleRefreshProcess(2, 'bl');
    statusBlocklistService.markFetched(refreshId, 'blocklistSingleRefresh');
    statusBlocklistService.markParsed(refreshId, 'blocklistSingleRefresh', 7);
    proc = statusBlocklistService.getProcessById(refreshId);
    expect(proc?.blocklistSingleRefresh?.step).toBe('delete');
    expect(proc?.blocklistSingleRefresh?.deleted).toBe('running');
  });

  it('markDeleted ignores fields without a delete step (import/enable)', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const importId = statusBlocklistService.createBlocklistImportProcess(1, 'bl');

    statusBlocklistService.markDeleted(importId, 'blocklistImport'); // no throw, no change
    const proc = statusBlocklistService.getProcessById(importId);
    expect(proc?.blocklistImport?.deleted).toBeUndefined();
  });

  it('addImportedIps and markBlocklistOpComplete accumulate and finish imports', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistImportProcess(1, 'bl');
    statusBlocklistService.markParsed(id, 'blocklistImport', 10);

    statusBlocklistService.addImportedIps(id, 'blocklistImport', 4);
    statusBlocklistService.addImportedIps(id, 'blocklistImport', 6);
    statusBlocklistService.markBlocklistOpComplete(id, 'blocklistImport');

    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistImport?.processIps.processedIps).toBe(10);
    expect(proc?.blocklistImport?.imported).toBe('successful');
  });

  it('setIpsToDelete and setDeletedIps track disable/delete progress', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistDisableProcess(10, 1, 'bl');

    statusBlocklistService.setIpsToDelete(id, 'blocklistDisable', 10);
    statusBlocklistService.setDeletedIps(id, 'blocklistDisable', 6);

    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistDisable?.ipsToDelete).toBe(10);
    expect(proc?.blocklistDisable?.processedIps).toBe(6);
  });

  it('completeProcess fails still-running fields and refresh steps', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);
    statusBlocklistService.setBlocklistStepStatus(id, 0, 'fetch', 'running');

    statusBlocklistService.completeProcess(id, false, 'boom');

    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.successful).toBe(false);
    expect(proc?.error).toBe('boom');
    expect(proc?.blocklistRefresh?.blocklists[0].steps.fetch).toBe('failed');
  });

  it('isBlocklistBusy ignores finished processes', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistImportProcess(1, 'bl');
    statusBlocklistService.completeProcess(id, true);

    expect(statusBlocklistService.isBlocklistBusy(1)).toBe(false);
  });

  it('isSyncingBlocklists is true while a single refresh is active', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    statusBlocklistService.createBlocklistSingleRefreshProcess(1, 'bl');
    expect(statusBlocklistService.isSyncingBlocklists()).toBe(true);
  });

  it('marks still-running fields as successful on successful completion', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistImportProcess(1, 'bl');
    statusBlocklistService.markFetched(id, 'blocklistImport'); // parsed = running

    statusBlocklistService.completeProcess(id, true);

    const proc = statusBlocklistService.getProcessById(id);
    expect(proc?.blocklistImport?.parsed).toBe('successful');
  });
});

describe('statusBlocklistService early-return branches', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('mark* and set* methods no-op on unknown process ids', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');

    expect(() => statusBlocklistService.markFetched('nope', 'blocklistImport')).not.toThrow();
    expect(() => statusBlocklistService.markParsed('nope', 'blocklistImport', 1)).not.toThrow();
    expect(() => statusBlocklistService.markDeleted('nope', 'blocklistImport')).not.toThrow();
    expect(() => statusBlocklistService.addImportedIps('nope', 'blocklistImport', 1)).not.toThrow();
    expect(() => statusBlocklistService.markBlocklistOpComplete('nope', 'blocklistImport')).not.toThrow();
    expect(() => statusBlocklistService.setIpsToDelete('nope', 'blocklistDisable', 1)).not.toThrow();
    expect(() => statusBlocklistService.setDeletedIps('nope', 'blocklistDisable', 1)).not.toThrow();
    expect(() => statusBlocklistService.setCurrentBlocklist('nope', 0)).not.toThrow();
    expect(() => statusBlocklistService.setBlocklistStepStatus('nope', 0, 'fetch', 'running')).not.toThrow();
    expect(() => statusBlocklistService.addBlocklistIps('nope', 1)).not.toThrow();
    statusBlocklistService.completeProcess('nope', true); // no throw
  });

  it('mark* methods no-op when the process exists but the field is missing', async () => {
    const { statusBlocklistService } = await import('@/infrastructure/status/memory-process-tracker');
    const id = statusBlocklistService.createBlocklistRefreshProcess([{ number: 1, name: 'bl-1' }]);

    // a refresh process has no blocklistImport / blocklistEnable / blocklistDelete field
    expect(() => statusBlocklistService.markFetched(id, 'blocklistImport')).not.toThrow();
    expect(() => statusBlocklistService.markParsed(id, 'blocklistEnable', 1)).not.toThrow();
    expect(() => statusBlocklistService.markDeleted(id, 'blocklistEnable')).not.toThrow();
    expect(() => statusBlocklistService.addImportedIps(id, 'blocklistDelete' as never, 1)).not.toThrow();
    expect(() => statusBlocklistService.markBlocklistOpComplete(id, 'blocklistDelete' as never)).not.toThrow();
    expect(() => statusBlocklistService.setIpsToDelete(id, 'blocklistDisable', 1)).not.toThrow();
    expect(() => statusBlocklistService.setDeletedIps(id, 'blocklistDisable', 1)).not.toThrow();
    expect(() => statusBlocklistService.setCurrentBlocklist(id, 0)).not.toThrow();
  });
});
