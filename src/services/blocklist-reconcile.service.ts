import { Blocklist, BlocklistIp } from '@/models';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import appDefaults from '@/constants/app-defaults';

class BlocklistReconcileService {
  /**
   * Reconcile enabled blocklists in the DB against active CrowdSec alerts.
   *
   * Fetches all alerts with has_active_decision=true and
   * origin=cs-monitor-blocklist-import, extracts the blocklist names from
   * the scenario field, then disables any enabled blocklist that has no
   * corresponding alert in CrowdSec (meaning it was intentionally removed).
   */
  async reconcile(): Promise<{ deactivated: number }> {
    console.log('Starting blocklist reconciliation with CrowdSec...');

    const alerts = await crowdSecAPI.getAlerts({
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
        await blocklist.update({ enabled: false });
        await BlocklistIp.destroy({ where: { blocklist_id: blocklist.id } });
        console.log(`  Disabled blocklist "${blocklist.name}" and removed its IPs (no active alerts found in CrowdSec)`);
      }
    }

    console.log(`✓ Blocklist reconciliation complete: ${missing.length} blocklist(s) disabled`);
    return { deactivated: missing.length };
  }
}

export const blocklistReconcileService = new BlocklistReconcileService();
