import { BlocklistsTable } from '@/models/db';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { blocklistSyncService } from '@/services/blocklists/blocklist-sync.service';
import appDefaults from '@/constants/app-defaults';
import { log } from '@/services/log.service';

class BlocklistReconcileService {
  /**
   * Reconcile enabled blocklists in the DB against active CrowdSec alerts.
   *
   * Fetches all alerts with has_active_decision=true and
   * origin=cs-monitor-blocklist-import, extracts the blocklist names from
   * the scenario field, then re-syncs any enabled blocklist that has no
   * corresponding alert in CrowdSec (meaning the alerts are missing or expired).
   */
  async reconcile(): Promise<{ resynced: number }> {
    log.debug('Starting blocklist reconciliation with CrowdSec...');

    const alerts = await crowdSecAPI.alerts.getAlerts({
      has_active_decision: true,
      origin: appDefaults.blocklists.importOrigin,
    });

    log.debug(`Fetched ${alerts.length} active alerts from CrowdSec (origin=${appDefaults.blocklists.importOrigin})`);

    // Extract unique blocklist names from alert scenario fields
    const activeBlocklistNames = new Set<string>();
    for (const alert of alerts) {
      const match = alert.scenario.match(appDefaults.blocklists.scenarioRegex);
      if (match) {
        activeBlocklistNames.add(match[1]);
      }
    }

    log.debug(`Extracted ${activeBlocklistNames.size} blocklist name(s) from alert scenarios`);

    const enabledBlocklists = await BlocklistsTable.findAll({ where: { enabled: true } });
    log.debug(`Found ${enabledBlocklists.length} enabled blocklist(s) in DB`);

    const missing = enabledBlocklists.filter((b) => !activeBlocklistNames.has(b.name));

    if (missing.length > 0) {
      log.debug(`${missing.length} blocklist(s) missing from CrowdSec: [${missing.map(b => b.name).join(', ')}]`);

      for (const blocklist of missing) {
        log.debug(`Re-syncing missing blocklist "${blocklist.name}"...`);
        await blocklistSyncService.refreshBlocklist(blocklist);
      }
    }

    log.info(`Blocklists reconciliation complete: ${missing.length} blocklist(s) re-synced`);
    return { resynced: missing.length };
  }
}

export const blocklistReconcileService = new BlocklistReconcileService();
