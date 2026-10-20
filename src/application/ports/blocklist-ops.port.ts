import type { PROCESS_FIELD_BLOCKLIST, PROCESS_FIELD_BLOCKLIST_OPS } from '@/types/process.types';

// Implemented by: infrastructure/sync/blocklist-ops
// Called by: application/use-cases/blocklists/*, composition root (jobs)
export interface BlocklistOpsPort {
  activateBlocklist(
    entry: unknown,
    source?: unknown,
    processId?: string,
    processField?: (typeof PROCESS_FIELD_BLOCKLIST)[keyof typeof PROCESS_FIELD_BLOCKLIST],
  ): Promise<unknown>;
  deleteBlocklistAlerts(
    entry: unknown,
    processId?: string,
    processField?: (typeof PROCESS_FIELD_BLOCKLIST_OPS)[keyof typeof PROCESS_FIELD_BLOCKLIST_OPS],
  ): Promise<unknown>;
  refreshBlocklists(target?: unknown): Promise<unknown>;
}
