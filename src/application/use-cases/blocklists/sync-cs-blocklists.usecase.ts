import type { CsBlocklistSyncPort } from '@/application/ports/cs-blocklist-sync.port';

/**
 * Syncs CrowdSec-managed blocklists (alerts with origin=lists → cs_blocklists
 * table + their IPs) into the local DB.
 *
 * Strangler note: the pipeline still lives in the infrastructure cs-blocklists
 * sync service behind the CsBlocklistSyncPort; the orchestration rewrite moves
 * it fully into this layer (debt (a) in the feature Log).
 */
// Called by: application/jobs/sync-cs-blocklists.job
export class SyncCsBlocklistsUseCase {
  constructor(private readonly deps: { csBlocklistSync: CsBlocklistSyncPort }) {}

  execute(): Promise<{ synced: number; ips: number; errors: number }> {
    return this.deps.csBlocklistSync.syncCsBlocklists();
  }
}
