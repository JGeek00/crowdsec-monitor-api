import type { PROCESS_FIELD_BLOCKLIST, PROCESS_FIELD_BLOCKLIST_OPS } from '@/shared/process.types';

/** Minimal blocklist shape the ops pipeline needs (Sequelize model satisfies it structurally). */
export interface BlocklistOpsEntry {
  id: number;
  name: string;
  url: string;
}

/** Outcome of one `refreshBlocklists` run. */
export interface BlocklistRefreshResult {
  refreshed: number;
  totalIps: number;
  errors: { fetch: string[]; parse: string[]; delete: string[]; import: string[] };
}

// Implemented by: infrastructure/sync/blocklist-ops
// Called by: application/use-cases/blocklists/*, composition root (jobs)
export interface BlocklistOpsPort {
  activateBlocklist(
    entry: BlocklistOpsEntry,
    source?: string[],
    processId?: string,
    processField?: (typeof PROCESS_FIELD_BLOCKLIST)[keyof typeof PROCESS_FIELD_BLOCKLIST],
  ): Promise<{ allowlistSkipped: number }>;
  deleteBlocklistAlerts(
    entry: BlocklistOpsEntry,
    processId?: string,
    processField?: (typeof PROCESS_FIELD_BLOCKLIST_OPS)[keyof typeof PROCESS_FIELD_BLOCKLIST_OPS],
  ): Promise<void>;
  refreshBlocklists(target?: BlocklistOpsEntry): Promise<BlocklistRefreshResult>;
}
