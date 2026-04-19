import { Blocklist } from '@/models';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { blocklistSyncService } from '@/services/blocklists/blocklist-sync.service';
import appDefaults from '@/constants/app-defaults';

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
    console.log('Starting blocklist reconciliation with CrowdSec...');

    const alerts = await crowdSecAPI.alerts.getAlerts({
      has_active_decision: true,
      origin: appDefaults.blocklists.importOrigin,
    });

    // Extract unique blocklist names from alert scenario fields
    const activeBlocklistNames = new Set<string>();
    for (const alert of alerts) {
      const match = alert.scenario.match(appDefaults.blocklists.scenarioRegex);
      if (match) {
        activeBlocklistNames.add(match[1]);
      }
    }

    console.log(`  Found ${activeBlocklistNames.size} blocklist(s) with active alerts in CrowdSec`);

    const enabledBlocklists = await Blocklist.findAll({ where: { enabled: true } });

    const missing = enabledBlocklists.filter((b) => !activeBlocklistNames.has(b.name));

    if (missing.length > 0) {
      for (const blocklist of missing) {
        console.log(`  Re-syncing blocklist "${blocklist.name}" (no active alerts found in CrowdSec)`);
        await blocklistSyncService.refreshBlocklist(blocklist);
      }
    }

    console.log(`✓ Blocklist reconciliation complete: ${missing.length} blocklist(s) re-synced`);
    return { resynced: missing.length };
  }
}

export const blocklistReconcileService = new BlocklistReconcileService();
