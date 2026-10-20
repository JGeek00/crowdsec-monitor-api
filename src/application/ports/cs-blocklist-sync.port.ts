// Implemented by: infrastructure/sync/cs-blocklists-sync
// Called by: application/use-cases/blocklists/sync-cs-blocklists.usecase (composition root job)
export interface CsBlocklistSyncPort {
  syncCsBlocklists(): Promise<{ synced: number; ips: number; errors: number }>;
}
