import { BlocklistsTable } from '@/infrastructure/persistence/sequelize/models';
import { log } from '@/infrastructure/system/logger';
import { runBlocklistRefreshPipeline } from '@/infrastructure/sync/blocklists-refresh-pipeline';
import { statusBlocklistService, BulkRefreshReporter } from '@/infrastructure/status/memory-process-tracker';

/**
 * Process a single blocklist inside the bulk refresh loop.
 * Returns pushed count on success, throws on failure with failedStep attached.
 */
export async function processOneBlocklist(
  blocklist: BlocklistsTable,
  allowlistEntries: string[],
  processId: string,
  index: number,
  total: number,
): Promise<{ pushed: number }> {
  log.debug(`Processing blocklist ${index + 1}/${total}: "${blocklist.name}"`);
  statusBlocklistService.setCurrentBlocklist(processId, index + 1);

  const reporter = new BulkRefreshReporter(processId, index);

  try {
    const { pushed } = await runBlocklistRefreshPipeline(blocklist, allowlistEntries, reporter);
    reporter.recordSuccess(pushed);
    return { pushed };
  } catch (err) {
    const failedStep = reporter.getFailedStep() as 'fetch' | 'parse' | 'delete' | 'import' | null;
    if (failedStep) {
      (err as { failedStep?: 'fetch' | 'parse' | 'delete' | 'import' }).failedStep = failedStep;
    }
    throw err;
  }
}
