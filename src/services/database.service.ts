import { BlocklistsTable } from '@/models';
import { alertsSyncService } from '@/services/alerts-sync.service';
import { blocklistSyncService } from '@/services/blocklists/blocklist-sync.service';
import { csBlocklistSyncService } from '@/services/blocklists/cs-blocklist-sync.service';
import type { ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';

/**
 * Facade that delegates to AlertsSyncService and BlocklistSyncService.
 * Preserves the existing public API so all callers remain unchanged.
 */
class DatabaseService {
  getLastSuccessfulSync(): Date | null {
    return alertsSyncService.getLastSuccessfulSync();
  }

  async syncAlerts() {
    return alertsSyncService.syncAlerts();
  }

  async cleanupOldData() {
    return alertsSyncService.cleanupOldData();
  }

  /** @deprecated Use syncAlerts() instead */
  async syncDecisions() {
    return alertsSyncService.syncDecisions();
  }

  async syncAll() {
    return alertsSyncService.syncAll();
  }

  async refreshBlocklist(
    blocklistsTableEntry: BlocklistsTable,
    processId?: string,
    processField?: ProcessFieldBlocklist,
  ) {
    return blocklistSyncService.refreshBlocklist(blocklistsTableEntry, undefined, processId, processField);
  }

  async deleteBlocklistAlerts(
    blocklistsTableEntry: BlocklistsTable,
    processId?: string,
    processField?: ProcessFieldBlocklistOps,
  ) {
    return blocklistSyncService.deleteBlocklistAlerts(blocklistsTableEntry, processId, processField);
  }

  async syncBlocklists() {
    return blocklistSyncService.syncBlocklists();
  }

  async syncCsBlocklists() {
    return csBlocklistSyncService.syncCsBlocklists();
  }
}

export const databaseService = new DatabaseService();
