import { Blocklist } from '../models';
import { alertsSyncService } from './alerts-sync.service';
import { blocklistSyncService } from './blocklist-sync.service';

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
}

export const databaseService = new DatabaseService();

