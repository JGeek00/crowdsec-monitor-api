import { CsBlocklistsTable, BLOCKLIST_IP_ORIGIN, BlocklistIpsTable } from '@/models';
import { sequelize } from '@/config/database';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import appDefaults from '@/constants/app-defaults';
import { log } from '@/services/log.service';

class CsBlocklistSyncService {
  /**
   * Fetch CrowdSec-managed blocklists (origin=lists) from the LAPI,
   * upsert cs_blocklists rows, and refresh BlocklistIp entries for them.
   */
  async syncCsBlocklists(): Promise<{ synced: number; ips: number; errors: number }> {
    let synced = 0;
    let ipsCount = 0;
    let errors = 0;

    log.debug('Fetching CrowdSec-managed blocklists (origin=lists)...');

    const alerts = await crowdSecAPI.alerts.getAlerts({
      has_active_decision: true,
      origin: 'lists',
    });

    log.debug(`Fetched ${alerts.length} CrowdSec alerts with origin=lists`);

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
    log.debug(`Deduplicated: ${deduplicatedAlerts.length} unique blocklist(s) from ${alerts.length} alerts`);

    for (const alert of deduplicatedAlerts) {
      try {
        const decisions = alert.decisions ?? [];
        const name = alert.source?.scope ?? '';
        log.debug(`Syncing CS blocklist "${name}" (${decisions.length} decisions, alert#${alert.id})`);

        await sequelize.transaction(async (t) => {
          // Destroy any existing entry for this name (IPs cascade-delete via FK).
          // This handles stale rows with different alert IDs from previous syncs.
          log.debug(`  Removing existing entry for CS blocklist "${name}"`);
          await CsBlocklistsTable.destroy({
            where: { name },
            transaction: t,
          });

          log.debug(`  Creating CS blocklist entry "${name}" (id: crowdsec-${alert.id})`);
          await CsBlocklistsTable.create({ id: `crowdsec-${alert.id}`, name }, { transaction: t });

          const chunkSize = appDefaults.blocklists.csBlocklistDbWriteChunkSize;
          const chunkCount = Math.ceil(decisions.length / chunkSize);
          log.debug(`  Writing ${decisions.length} IPs to DB for "${name}" in ${chunkCount} chunk(s)`);

          for (let i = 0; i < decisions.length; i += chunkSize) {
            const chunk = decisions.slice(i, i + chunkSize).map((decision) => ({
              cs_blocklist_id: `crowdsec-${alert.id}`,
              blocklist_name: decision.scenario,
              value: decision.value,
              origin: BLOCKLIST_IP_ORIGIN.CS_BLOCKLIST,
            }));
            await BlocklistIpsTable.bulkCreate(chunk, { transaction: t, ignoreDuplicates: true });
          }
        });

        const count = decisions.length;
        ipsCount += count;
        synced++;
        log.debug(`  CS blocklist "${name}" synced: ${count} IPs`);
      } catch (err) {
        errors++;
        log.error(`Failed to sync CrowdSec blocklist alert id=${alert.id}:`, err);
      }
    }

    log.info(`CS blocklists sync complete: ${synced} synced, ${ipsCount} IPs, ${errors} errors`);

    return { synced, ips: ipsCount, errors };
  }
}

export const csBlocklistSyncService = new CsBlocklistSyncService();
