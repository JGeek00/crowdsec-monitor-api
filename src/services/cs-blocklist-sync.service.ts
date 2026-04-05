import { CsBlocklist, BlocklistIp } from '@/models';
import { sequelize } from '@/config/database';
import { crowdSecAPI } from '@/services/crowdsec-api.service';

const CHUNK_SIZE = 1000;

class CsBlocklistSyncService {
  /**
   * Fetch CrowdSec-managed blocklists (origin=lists) from the LAPI,
   * upsert cs_blocklists rows, and refresh BlocklistIp entries for them.
   */
  async syncCsBlocklists(): Promise<{ synced: number; ips: number; errors: number }> {
    let synced = 0;
    let ipsCount = 0;
    let errors = 0;

    const alerts = await crowdSecAPI.getAlerts({
      has_active_decision: true,
      origin: 'lists',
    });

    if (alerts.length === 0) {
      return { synced: 0, ips: 0, errors: 0 };
    }

    // Deduplicate alerts by name: keep the latest one (highest ID) per unique list name.
    // CrowdSec generates a new alert each time it updates the IPs for a blocklist,
    // so the highest alert ID is always the most recent version.
    const alertsByName = new Map<string, (typeof alerts)[0]>();
    for (const alert of alerts) {
      const name = alert.source?.scope ?? '';
      const existing = alertsByName.get(name);
      if (!existing || alert.id > existing.id) {
        alertsByName.set(name, alert);
      }
    }
    const deduplicatedAlerts = Array.from(alertsByName.values());

    for (const alert of deduplicatedAlerts) {
      try {
        const decisions = alert.decisions ?? [];
        const name = alert.source?.scope ?? '';

        await sequelize.transaction(async (t) => {
          // Destroy any existing entry for this name (IPs cascade-delete via FK).
          // This handles stale rows with different alert IDs from previous syncs.
          await CsBlocklist.destroy({
            where: { name },
            transaction: t,
          });

          await CsBlocklist.create(
            { id: alert.id, name },
            { transaction: t }
          );

          for (let i = 0; i < decisions.length; i += CHUNK_SIZE) {
            const chunk = decisions.slice(i, i + CHUNK_SIZE).map((decision) => ({
              cs_blocklist_id: alert.id,
              blocklist_name: decision.scenario,
              value: decision.value,
              origin: 'cs_blocklist' as const,
            }));
            await BlocklistIp.bulkCreate(chunk, { transaction: t, ignoreDuplicates: true });
          }
        });

        const count = decisions.length;
        ipsCount += count;
        synced++;
      } catch (error) {
        errors++;
        console.error(`✗ Failed to sync CrowdSec blocklist alert id=${alert.id}:`, error);
      }
    }

    return { synced, ips: ipsCount, errors };
  }
}

export const csBlocklistSyncService = new CsBlocklistSyncService();
