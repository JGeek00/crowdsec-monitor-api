import { csBlocklistSyncService } from '@/infrastructure/sync/cs-blocklists-sync';

/**
 * Syncs CrowdSec-managed blocklists (alerts with origin=lists → cs_blocklists
 * table + their IPs) into the local DB.
 *
 * Strangler note: the pipeline still lives in the legacy cs-blocklists-sync
 * service; the application-facing entry point is port-shaped for jobs and
 * controllers (debt (a) in the feature Log — ports land with T15).
 */
// Called by: application/jobs/sync-cs-blocklists.job
export class SyncCsBlocklistsUseCase {
  execute(): Promise<unknown> {
    return csBlocklistSyncService.syncCsBlocklists();
  }
}

export const syncCsBlocklistsUseCase = new SyncCsBlocklistsUseCase();
