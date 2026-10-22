import { describe, it, expect, vi } from 'vitest';
import { SingleRefreshReporter, BulkRefreshReporter, statusBlocklistService } from '@/infrastructure/status/memory-process-tracker';
import { PROCESS_BLOCKLIST_STEP_STATUS, PROCESS_FIELD_BLOCKLIST } from '@/shared/process.types';

describe('SingleRefreshReporter', () => {
  const reporter = new SingleRefreshReporter('p1');

  it('marks fetch steps successful', () => {
    const spy = vi.spyOn(statusBlocklistService, 'markFetched').mockImplementation(() => undefined);
    reporter.onStep('fetch', PROCESS_BLOCKLIST_STEP_STATUS.SUCCESSFUL);
    expect(spy).toHaveBeenCalledWith('p1', PROCESS_FIELD_BLOCKLIST.SINGLE_REFRESH);
    spy.mockRestore();
  });

  it('marks delete steps successful', () => {
    const spy = vi.spyOn(statusBlocklistService, 'markDeleted').mockImplementation(() => undefined);
    reporter.onStep('delete', PROCESS_BLOCKLIST_STEP_STATUS.SUCCESSFUL);
    expect(spy).toHaveBeenCalledWith('p1', PROCESS_FIELD_BLOCKLIST.SINGLE_REFRESH);
    spy.mockRestore();
  });

  it('ignores steps that are not successful', () => {
    const fetchSpy = vi.spyOn(statusBlocklistService, 'markFetched').mockImplementation(() => undefined);
    const deleteSpy = vi.spyOn(statusBlocklistService, 'markDeleted').mockImplementation(() => undefined);
    reporter.onStep('fetch', PROCESS_BLOCKLIST_STEP_STATUS.FAILED);
    reporter.onStep('delete', PROCESS_BLOCKLIST_STEP_STATUS.PENDING);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  it('forwards parsed totals and import progress to the tracker', () => {
    const parsedSpy = vi.spyOn(statusBlocklistService, 'markParsed').mockImplementation(() => undefined);
    const importSpy = vi.spyOn(statusBlocklistService, 'addImportedIps').mockImplementation(() => undefined);
    reporter.onParsed(42);
    reporter.onImportProgress(10);
    expect(parsedSpy).toHaveBeenCalledWith('p1', PROCESS_FIELD_BLOCKLIST.SINGLE_REFRESH, 42);
    expect(importSpy).toHaveBeenCalledWith('p1', PROCESS_FIELD_BLOCKLIST.SINGLE_REFRESH, 10);
    parsedSpy.mockRestore();
    importSpy.mockRestore();
  });

  it('marks the blocklist operation complete', () => {
    const spy = vi.spyOn(statusBlocklistService, 'markBlocklistOpComplete').mockImplementation(() => undefined);
    reporter.markComplete();
    expect(spy).toHaveBeenCalledWith('p1', PROCESS_FIELD_BLOCKLIST.SINGLE_REFRESH);
    spy.mockRestore();
  });
});

describe('BulkRefreshReporter', () => {
  const reporter = new BulkRefreshReporter('p2', 0);

  it('forwards every step status to the tracker', () => {
    const spy = vi.spyOn(statusBlocklistService, 'setBlocklistStepStatus').mockImplementation(() => undefined);
    reporter.onStep('fetch', PROCESS_BLOCKLIST_STEP_STATUS.RUNNING);
    expect(spy).toHaveBeenCalledWith('p2', 0, 'fetch', PROCESS_BLOCKLIST_STEP_STATUS.RUNNING);
    spy.mockRestore();
  });

  it('records the failed step', () => {
    const spy = vi.spyOn(statusBlocklistService, 'setBlocklistStepStatus').mockImplementation(() => undefined);
    reporter.onStep('import', PROCESS_BLOCKLIST_STEP_STATUS.FAILED);
    expect(reporter.getFailedStep()).toBe('import');
    spy.mockRestore();
  });

  it('adds pushed IPs on success and ignores parse/import progress', () => {
    const addSpy = vi.spyOn(statusBlocklistService, 'addBlocklistIps').mockImplementation(() => undefined);
    expect(() => reporter.onParsed()).not.toThrow();
    // BulkRefreshReporter ignores progress args; call through a wider signature on purpose.
    (reporter.onImportProgress as (chunkSize: number) => void)(5);
    reporter.recordSuccess(7);
    expect(addSpy).toHaveBeenCalledWith('p2', 7);
    addSpy.mockRestore();
  });
});
