import { Blocklist } from '@/models';
import { alertsSyncService } from '@/services/alerts-sync.service';
import { blocklistSyncService } from '@/services/blocklist-sync.service';
import { csBlocklistSyncService } from '@/services/cs-blocklist-sync.service';
import { blocklistReconcileService } from '@/services/blocklist-reconcile.service';

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

  async refreshBlocklist(blocklist: Blocklist) {
    return blocklistSyncService.refreshBlocklist(blocklist);
  }

  async deleteBlocklistAlerts(blocklist: Blocklist) {
    return blocklistSyncService.deleteBlocklistAlerts(blocklist);
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

