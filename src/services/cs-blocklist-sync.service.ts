import { CsBlocklist, BlocklistIp } from '../models';
import { sequelize } from '../config/database';
import { crowdSecAPI } from './crowdsec-api.service';

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
      console.log('No CrowdSec-managed blocklists found (origin=lists).');
      return { synced: 0, ips: 0, errors: 0 };
    }

    console.log(`Syncing ${alerts.length} CrowdSec blocklist alert(s)...`);

    for (const alert of alerts) {
      try {
        const decisions = alert.decisions ?? [];
        const name = alert.source?.scope ?? '';

        await sequelize.transaction(async (t) => {
          await CsBlocklist.upsert(
            { id: alert.id, name },
            { transaction: t }
          );

          await BlocklistIp.destroy({
            where: { cs_blocklist_id: alert.id },
            transaction: t,
          });

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
        console.log(`✓ Synced CrowdSec blocklist "${name}" (id=${alert.id}): ${count} IPs`);
      } catch (error) {
        errors++;
        console.error(`✗ Failed to sync CrowdSec blocklist alert id=${alert.id}:`, error);
      }
    }

    console.log(`CrowdSec blocklists sync complete: ${synced} synced, ${ipsCount} IPs, ${errors} error(s).`);
    return { synced, ips: ipsCount, errors };
  }
}

export const csBlocklistSyncService = new CsBlocklistSyncService();
