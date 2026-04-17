import { Blocklist } from '@/models';
import { alertsSyncService } from '@/services/alerts-sync.service';
import { blocklistSyncService } from '@/services/blocklists/blocklist-sync.service';
import { csBlocklistSyncService } from '@/services/blocklists/cs-blocklist-sync.service';
import { blocklistReconcileService } from '@/services/blocklists/blocklist-reconcile.service';
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

  async refreshBlocklist(blocklist: Blocklist, processId?: string, processField?: ProcessFieldBlocklist) {
    return blocklistSyncService.refreshBlocklist(blocklist, undefined, processId, processField);
  }

  async deleteBlocklistAlerts(blocklist: Blocklist, processId?: string, processField?: ProcessFieldBlocklistOps) {
    return blocklistSyncService.deleteBlocklistAlerts(blocklist, processId, processField);
  }

  async syncBlocklists() {
    return blocklistSyncService.syncBlocklists();
  }

  async syncCsBlocklists() {
    return csBlocklistSyncService.syncCsBlocklists();
  }

  async reconcileBlocklistIps() {
    return blocklistReconcileService.reconcile();
  }
}

export const databaseService = new DatabaseService();

