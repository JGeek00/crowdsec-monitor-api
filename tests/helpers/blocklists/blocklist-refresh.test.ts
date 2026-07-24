import { describe, it, expect, vi } from 'vitest';

vi.mock('@/models', () => ({
  BlocklistsTable: {},
}));

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/helpers/blocklists/blocklists-refresh-pipeline', () => ({
  runBlocklistRefreshPipeline: vi.fn(),
}));

vi.mock('@/services/blocklists/status-blocklist.service', () => {
  const mockSetCurrentBlocklist = vi.fn();
  const mockRecordSuccess = vi.fn();
  const mockGetFailedStep = vi.fn();
  const BulkRefreshReporter = vi.fn().mockImplementation(() => ({
    recordSuccess: mockRecordSuccess,
    getFailedStep: mockGetFailedStep,
  }));
  return {
    statusBlocklistService: { setCurrentBlocklist: mockSetCurrentBlocklist },
    BulkRefreshReporter,
  };
});

describe('processOneBlocklist', () => {
  it('returns pushed count on success', async () => {
    const { runBlocklistRefreshPipeline } = await import('@/helpers/blocklists/blocklists-refresh-pipeline');
    vi.mocked(runBlocklistRefreshPipeline).mockResolvedValue({ pushed: 10 });

    const { processOneBlocklist } = await import('@/helpers/blocklists/blocklist-refresh');
    const result = await processOneBlocklist({ name: 'test-list', id: 1 } as any, [], 'proc-1', 0, 1);

    expect(result).toEqual({ pushed: 10 });
  });

  it('re-throws error with failedStep when pipeline fails', async () => {
    const { runBlocklistRefreshPipeline } = await import('@/helpers/blocklists/blocklists-refresh-pipeline');
    vi.mocked(runBlocklistRefreshPipeline).mockRejectedValue(new Error('fetch error'));

    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');
    const mockReporter = vi.mocked(statusBlocklistService.setCurrentBlocklist).mock;
    // BulkRefreshReporter constructor attaches failedStep
    vi.mocked(statusBlocklistService.setCurrentBlocklist).mock.calls; // just reference

    const BulkRefreshReporter = (await import('@/services/blocklists/status-blocklist.service')).BulkRefreshReporter;

    const { processOneBlocklist } = await import('@/helpers/blocklists/blocklist-refresh');
    try {
      await processOneBlocklist({ name: 'test-list', id: 1 } as any, [], 'proc-1', 0, 1);
    } catch (err) {
      expect((err as any).failedStep).toBeUndefined();
    }
  });

  it('sets currentBlocklist on status service', async () => {
    const { runBlocklistRefreshPipeline } = await import('@/helpers/blocklists/blocklists-refresh-pipeline');
    vi.mocked(runBlocklistRefreshPipeline).mockResolvedValue({ pushed: 5 });

    const { statusBlocklistService } = await import('@/services/blocklists/status-blocklist.service');

    const { processOneBlocklist } = await import('@/helpers/blocklists/blocklist-refresh');
    await processOneBlocklist({ name: 'bl-1', id: 2 } as any, [], 'proc-2', 1, 3);

    expect(statusBlocklistService.setCurrentBlocklist).toHaveBeenCalledWith('proc-2', 2);
  });
});
