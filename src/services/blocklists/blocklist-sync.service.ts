import axios from 'axios';
import { Blocklist, BlocklistIp } from '@/models';
import { BLOCKLIST_IP_ORIGIN } from '@/models/BlocklistIp';
import { sequelize } from '@/config/database';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import { statusService } from '@/services/status.service';
import type { ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';
import { CrowdSecCreateAlertPayload } from '@/types/crowdsec.types';
import { countIpsInValue } from '@/utils/ip-count';
import { buildAllowlistMatcher } from '@/utils/ip';
import { config } from '@/config';
import { ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex } from '@/constants/regexps';
import { DB_MODE } from '@/interfaces/database.interface';
import appDefaults from '@/constants/app-defaults';
import { PROCESS_ERRORS } from '@/constants/process-errors';

class BlocklistSyncService {
  private writeLock: Promise<void> = Promise.resolve();

  private acquireWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(() => fn());
    this.writeLock = next.then(() => {}, () => {});
    return next;
  }

  private async fetchAllowlistEntries(): Promise<string[]> {
    try {
      const allowlists = await crowdSecAPI.allowlists.getAllowlists();
      return allowlists.flatMap(al => al.items.map(item => item.value));
    } catch {
      console.error('Failed to fetch allowlists from CrowdSec. No allowlist filtering will be applied.');
      return [];
    }
  }

  /**
   * Fetch a blocklist URL, store IPs in the local DB, and push to CrowdSec.
   */
  async refreshBlocklist(
    blocklist: Blocklist,
    allowlistEntries?: string[],
    processId?: string,
    processField?: ProcessFieldBlocklist,
  ): Promise<{ allowlistSkipped: number }> {

    await this.acquireWriteLock(() =>
      blocklist.update({ last_refresh_attempt: new Date() })
    );

    const response = await axios.get<string>(blocklist.url, {
      responseType: 'text',
      timeout: 30000,
    }).catch(() => { throw new Error(PROCESS_ERRORS.blocklistImport.fetchFailed); });

    if (processId && processField) {
      statusBlocklistService.markFetched(processId, processField);
    }

    const ips = response.data
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) =>
        !line.startsWith('#') &&
        (ipv4Regex.test(line) || ipv4CidrRegex.test(line) || ipv6Regex.test(line) || ipv6CidrRegex.test(line))
      );

    const totalIpCount = ips.reduce((sum: number, v: string) => sum + countIpsInValue(v), 0);

    // Apply allowlist filter
    const entries = allowlistEntries ?? await this.fetchAllowlistEntries();
    const isAllowlisted = buildAllowlistMatcher(entries);
    const allowlistFiltered = ips.filter(ip => !isAllowlisted(ip));
    const allowlistSkipped = ips.length - allowlistFiltered.length;

    // Fetch currently active decisions from CrowdSec to avoid pushing duplicates
    let activeDecisions: Set<string>;
    try {
      activeDecisions = await crowdSecAPI.decisions.getActiveDecisions();
      crowdSecAPI.setBouncerConnected(true);
      statusService.updateBouncerStatus(true);
    } catch {
      console.error(`Failed to fetch active decisions from CrowdSec. Aborting blocklist import for "${blocklist.name}".`);
      crowdSecAPI.setBouncerConnected(false);
      statusService.updateBouncerStatus(false);
      throw new Error(PROCESS_ERRORS.blocklistImport.crowdSecDecisionsFailed);
    }
    const uniqueNewIps = [...new Set(allowlistFiltered.filter((ip) => !activeDecisions.has(ip)))];
    const alreadyBlocked = allowlistFiltered.length - uniqueNewIps.length;
    if (alreadyBlocked > 0) {
      console.log(`  Skipping ${alreadyBlocked} IPs already blocked in CrowdSec for "${blocklist.name}"`);
    }

    if (processId && processField) {
      statusBlocklistService.markParsed(processId, processField, uniqueNewIps.length);
    }

    // Save all IPs from the list to the DB (regardless of what's already in CrowdSec)
    try {
      await this.acquireWriteLock(async () => {
        await sequelize.transaction(async (t) => {
          await BlocklistIp.destroy({ where: { [BlocklistIp.col.blocklistId]: blocklist.id }, transaction: t });

          for (let i = 0; i < ips.length; i += appDefaults.blocklists.writeChunkSize) {
            const chunk = ips.slice(i, i + appDefaults.blocklists.writeChunkSize).map((value: string) => ({
              blocklist_id: blocklist.id,
              blocklist_name: blocklist.name,
              value,
              origin: BLOCKLIST_IP_ORIGIN.BLOCKLIST,
            }));
            await BlocklistIp.bulkCreate(chunk, { transaction: t, ignoreDuplicates: true });
          }
        });
      });
    } catch {
      throw new Error(PROCESS_ERRORS.blocklistImport.dbWriteFailed);
    }

    const scenario = `external/blocklist (${blocklist.name})`;
    const now = new Date().toISOString();
    const batchCount = Math.ceil(uniqueNewIps.length / appDefaults.blocklists.writeChunkSize);

    if (uniqueNewIps.length === 0) {
      console.log(`No new IPs to push for "${blocklist.name}" (all already blocked in CrowdSec)`);
    } else {
      console.log(`Pushing "${blocklist.name}" to CrowdSec (${uniqueNewIps.length} new entries, ${batchCount} batch(es))...`);

      for (let i = 0; i < uniqueNewIps.length; i += appDefaults.blocklists.writeChunkSize) {
        const chunk = uniqueNewIps.slice(i, i + appDefaults.blocklists.writeChunkSize);

        const payload: CrowdSecCreateAlertPayload = [
          {
            capacity: 0,
            events: [],
            events_count: 1,
            leakspeed: '0',
            message: `Blocking ${totalIpCount} IPs from list ${blocklist.name}`,
            scenario,
            scenario_hash: '',
            scenario_version: '',
            simulated: false,
            source: { scope: 'Ip', value: '0.0.0.0' },
            start_at: now,
            stop_at: now,
            decisions: chunk.map((value: string) => ({
              duration: config.blocklistBanDuration,
              origin: appDefaults.blocklists.importOrigin,
              scenario,
              scope: 'Ip',
              type: 'ban',
              value,
            })),
          },
        ];

        await crowdSecAPI.alerts.createAlerts(payload)
          .catch(() => { throw new Error(PROCESS_ERRORS.blocklistImport.crowdSecPushFailed); });

        if (processId && processField) {
          statusBlocklistService.addImportedIps(processId, processField, chunk.length);
        }

        const batchNum = Math.floor(i / appDefaults.blocklists.writeChunkSize) + 1;
        console.log(`  Batch ${batchNum}/${batchCount} sent (${chunk.length} decisions)`);
      }
    }

    if (processId && processField) {
      statusBlocklistService.markBlocklistOpComplete(processId, processField);
    }

    await this.acquireWriteLock(() =>
      blocklist.update({ last_successful_refresh: new Date() })
    );

    const parts = [
      `${uniqueNewIps.length} pushed to CrowdSec`,
      alreadyBlocked > 0 ? `${alreadyBlocked} already blocked` : null,
      allowlistSkipped > 0 ? `${allowlistSkipped} in allowlist` : null,
    ].filter(Boolean).join(', ');
    console.log(`✓ Refreshed "${blocklist.name}": ${ips.length} IPs in list — ${parts}`);

    return { allowlistSkipped };
  }

  /**
   * Delete all CrowdSec alerts for a blocklist and wipe its local IPs.
   */
  async deleteBlocklistAlerts(
    blocklist: Blocklist,
    processId?: string,
    processField?: ProcessFieldBlocklistOps,
  ): Promise<void> {
    const scenario = `external/blocklist (${blocklist.name})`;

    const alerts = await crowdSecAPI.alerts.getAlerts({
      origin: appDefaults.blocklists.importOrigin,
      scenario,
    }).catch(() => { throw new Error(PROCESS_ERRORS.blocklistDisable.crowdSecAlertsFetchFailed); });

    const totalDecisions = alerts.reduce((sum, a) => sum + (a.decisions?.length ?? 0), 0);
    if (processId && processField) {
      statusBlocklistService.setIpsToDelete(processId, processField, totalDecisions);
    }

    if (alerts.length > 0) {
      console.log(`Deleting ${alerts.length} alert(s) for blocklist "${blocklist.name}" from CrowdSec...`);
      let processedIps = 0;
      for (const alert of alerts) {
        await crowdSecAPI.alerts.deleteAlert(alert.id)
          .catch(() => { throw new Error(PROCESS_ERRORS.blocklistDisable.crowdSecAlertDeleteFailed); });
        processedIps += alert.decisions?.length ?? 0;
        if (processId && processField) {
          statusBlocklistService.setDeletedIps(processId, processField, processedIps);
        }
      }
    }

    try {
      await this.acquireWriteLock(async () => {
        while (true) {
          const chunk = await BlocklistIp.findAll({
            attributes: ['id'],
            where: { [BlocklistIp.col.blocklistId]: blocklist.id },
            limit: appDefaults.blocklists.writeChunkSize,
          });
          if (chunk.length === 0) break;
          await BlocklistIp.destroy({ where: { [BlocklistIp.col.id]: chunk.map((ip) => ip.id) } });
          if (chunk.length < appDefaults.blocklists.writeChunkSize) break;
        }
      });
    } catch {
      throw new Error(PROCESS_ERRORS.blocklistDisable.dbCleanupFailed);
    }

    console.log(`✓ Deleted alerts and IPs for blocklist "${blocklist.name}"`);
  }

  /**
   * Refresh every enabled blocklist and push to CrowdSec.
   */
  async syncBlocklists(): Promise<{ refreshed: number; ips: number; errors: number; allowlistSkipped: number }> {
    let refreshed = 0;
    let ipsCount = 0;
    let errors = 0;
    let totalAllowlistSkipped = 0;

    const blocklists = await Blocklist.findAll({ where: { enabled: true } });

    if (blocklists.length === 0) {
      return { refreshed: 0, ips: 0, errors: 0, allowlistSkipped: 0 };
    }

    const processId = statusBlocklistService.createBlocklistRefreshProcess(blocklists.length);

    // Fetch allowlist entries once for all blocklists
    const allowlistEntries = await this.fetchAllowlistEntries();

    for (const blocklist of blocklists) {
      try {
        const { allowlistSkipped } = await this.refreshBlocklist(blocklist, allowlistEntries);
        totalAllowlistSkipped += allowlistSkipped;
        ipsCount += await BlocklistIp.count({ where: { [BlocklistIp.col.blocklistId]: blocklist.id } });
        refreshed++;
        statusBlocklistService.incrementRefreshBlocklist(processId, true);
      } catch (error) {
        console.error(`❌ Error refreshing blocklist "${blocklist.name}" (${blocklist.url}): ${error instanceof Error ? error.message : error}`);
        errors++;
        statusBlocklistService.incrementRefreshBlocklist(processId, false);
      }
    }

    statusBlocklistService.completeProcess(processId, errors === 0, errors > 0 ? PROCESS_ERRORS.blocklistRefresh.partialFailure : null);

    if (config.database.mode === DB_MODE.SQLITE) {
      await sequelize.query('PRAGMA wal_checkpoint(PASSIVE);');
    }

    return { refreshed, ips: ipsCount, errors, allowlistSkipped: totalAllowlistSkipped };
  }
}

export const blocklistSyncService = new BlocklistSyncService();
