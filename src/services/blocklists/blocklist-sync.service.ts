import axios from 'axios';
import { BLOCKLIST_IP_ORIGIN, BlocklistIpsTable, BlocklistsTable } from '@/models';
import { sequelize } from '@/config/database';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import { statusService } from '@/services/status.service';
import type { ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';
import { CrowdSecCreateAlertPayload } from '@/types/crowdsec.types';
import { countIpsInValue } from '@/utils/ip-count';
import { buildAllowlistMatcher } from '@/utils/ip';
import { parseBlocklistContent } from '@/utils/parse-blocklist';
import { config } from '@/config';
import { defaults } from '@/config/env-defaults';
import { DB_MODE } from '@/types/database.types';
import appDefaults from '@/constants/app-defaults';
import { PROCESS_ERRORS } from '@/constants/process-errors';
import { log } from '@/services/log.service';

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
      const entries = allowlists.flatMap(al => al.items.map(item => item.value));
      log.debug(`  Fetched ${entries.length} allowlist entries from CrowdSec`);
      return entries;
    } catch (err) {
      log.warn('Failed to fetch allowlists from CrowdSec. No allowlist filtering will be applied.');
      return [];
    }
  }

  /**
   * Fetch a blocklist URL, store IPs in the local DB, and push to CrowdSec.
   */
  async refreshBlocklist(
    blocklistsTableEntry: BlocklistsTable,
    allowlistEntries?: string[],
    processId?: string,
    processField?: ProcessFieldBlocklist,
  ): Promise<{ allowlistSkipped: number }> {
    const name = blocklistsTableEntry.name;
    log.debug(`Refreshing blocklist "${name}" from ${blocklistsTableEntry.url}...`);

    await this.acquireWriteLock(() =>
      blocklistsTableEntry.update({ last_refresh_attempt: new Date(), last_refresh_failed: false })
    );

    const response = await axios.get<string>(blocklistsTableEntry.url, {
      responseType: 'text',
      timeout: 30000,
    }).catch(() => { throw new Error(PROCESS_ERRORS.blocklistImport.fetchFailed); });

    log.debug(`  Fetched "${name}": ${response.data.length} bytes`);

    if (processId && processField) {
      statusBlocklistService.markFetched(processId, processField);
    }

    const ips = parseBlocklistContent(response.data);

    const totalIpCount = ips.reduce((sum: number, v: string) => sum + countIpsInValue(v), 0);
    log.debug(`  Parsed "${name}": ${ips.length} lines, ${totalIpCount} total IPs (including CIDR ranges)`);

    // Apply allowlist filter
    const entries = allowlistEntries ?? await this.fetchAllowlistEntries();
    const isAllowlisted = buildAllowlistMatcher(entries);
    const allowlistFiltered = ips.filter(ip => !isAllowlisted(ip));
    const allowlistSkipped = ips.length - allowlistFiltered.length;

    if (allowlistSkipped > 0) {
      log.debug(`  Allowlist filtering "${name}": ${allowlistSkipped} skipped (${entries.length} allowlist entries)`);
    }

    // Fetch currently active decisions from CrowdSec to avoid pushing duplicates
    let activeDecisions: Set<string>;
    try {
      activeDecisions = await crowdSecAPI.decisions.getActiveDecisions();
      crowdSecAPI.setBouncerConnected(true);
      statusService.updateBouncerStatus(true);
      log.debug(`  Fetched ${activeDecisions.size} active decisions from CrowdSec`);
    } catch {
      log.error(`Failed to fetch active decisions from CrowdSec. Aborting blocklist import for "${name}".`);
      crowdSecAPI.setBouncerConnected(false);
      statusService.updateBouncerStatus(false);
      throw new Error(PROCESS_ERRORS.blocklistImport.crowdSecDecisionsFailed);
    }
    const uniqueNewIps = [...new Set(allowlistFiltered.filter((ip) => !activeDecisions.has(ip)))];
    const alreadyBlocked = allowlistFiltered.length - uniqueNewIps.length;

    if (alreadyBlocked > 0) {
      log.debug(`  "${name}": ${alreadyBlocked} IPs already blocked in CrowdSec`);
    }

    log.debug(`  "${name}": ${uniqueNewIps.length} new IPs ready to push`);

    if (processId && processField) {
      statusBlocklistService.markParsed(processId, processField, uniqueNewIps.length);
    }

    // Save all IPs from the list to the DB (regardless of what's already in CrowdSec)
    const dbChunkSize = defaults.blocklists.writeChunkSize;
    const dbChunkCount = Math.ceil(ips.length / dbChunkSize);
    log.debug(`  Writing ${ips.length} IPs to DB for "${name}" in ${dbChunkCount} chunk(s)`);

    try {
      await this.acquireWriteLock(async () => {
        await sequelize.transaction(async (t) => {
          await BlocklistIpsTable.destroy({ where: { [BlocklistIpsTable.col.blocklistId]: blocklistsTableEntry.id }, transaction: t });

          for (let i = 0; i < ips.length; i += dbChunkSize) {
            const chunk = ips.slice(i, i + dbChunkSize).map((value: string) => ({
              blocklist_id: blocklistsTableEntry.id,
              blocklist_name: blocklistsTableEntry.name,
              value,
              origin: BLOCKLIST_IP_ORIGIN.BLOCKLIST,
            }));
            await BlocklistIpsTable.bulkCreate(chunk, { transaction: t, ignoreDuplicates: true });
            log.debug(`    DB chunk ${Math.floor(i / dbChunkSize) + 1}/${dbChunkCount} written for "${name}" (${chunk.length} IPs)`);
          }
        });
      });
    } catch {
      throw new Error(PROCESS_ERRORS.blocklistImport.dbWriteFailed);
    }

    const scenario = `external/blocklist (${blocklistsTableEntry.name})`;
    const now = new Date().toISOString();
    const pushChunkSize = config.blocklists.writeChunkSize ?? uniqueNewIps.length;
    const batchCount = Math.ceil(uniqueNewIps.length / Math.max(pushChunkSize, 1));

    if (uniqueNewIps.length === 0) {
      log.debug(`  No new IPs to push for "${name}" (all already blocked in CrowdSec)`);
    } else {
      log.debug(`  Pushing "${name}" to CrowdSec: ${uniqueNewIps.length} new IPs, ${batchCount} batch(es) of ${pushChunkSize}`);

      for (let i = 0; i < uniqueNewIps.length; i += pushChunkSize) {
        const chunk = uniqueNewIps.slice(i, i + pushChunkSize);

        const payload: CrowdSecCreateAlertPayload = [
          {
            capacity: 0,
            events: [],
            events_count: 1,
            leakspeed: '0',
            message: `Blocking ${totalIpCount} IPs from list ${blocklistsTableEntry.name}`,
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

        const batchNum = Math.floor(i / pushChunkSize) + 1;
        log.debug(`    Batch ${batchNum}/${batchCount} sent for "${name}" (${chunk.length} decisions)`);
      }
    }

    if (processId && processField) {
      statusBlocklistService.markBlocklistOpComplete(processId, processField);
    }

    await this.acquireWriteLock(() =>
      blocklistsTableEntry.update({ last_successful_refresh: new Date(), last_refresh_failed: false })
    );
    log.debug(`    Updated last_successful_refresh for "${name}"`);

    const parts = [
      `${uniqueNewIps.length} pushed to CrowdSec`,
      alreadyBlocked > 0 ? `${alreadyBlocked} already blocked` : null,
      allowlistSkipped > 0 ? `${allowlistSkipped} in allowlist` : null,
    ].filter(Boolean).join(', ');
    log.info(`Refreshed "${name}": ${ips.length} IPs in list — ${parts}`);

    return { allowlistSkipped };
  }

  /**
   * Delete all CrowdSec alerts for a blocklist and wipe its local IPs.
   */
  async deleteBlocklistAlerts(
    blocklist: BlocklistsTable,
    processId?: string,
    processField?: ProcessFieldBlocklistOps,
  ): Promise<void> {
    const name = blocklist.name;
    log.debug(`Deleting blocklist "${name}" alerts from CrowdSec...`);

    const scenario = `external/blocklist (${blocklist.name})`;

    const alerts = await crowdSecAPI.alerts.getAlerts({
      origin: appDefaults.blocklists.importOrigin,
      scenario,
    }).catch(() => { throw new Error(PROCESS_ERRORS.blocklistDisable.crowdSecAlertsFetchFailed); });

    log.debug(`  Found ${alerts.length} alert(s) for "${name}"`);

    const totalDecisions = alerts.reduce((sum, a) => sum + (a.decisions?.length ?? 0), 0);
    log.debug(`  Total decisions to remove: ${totalDecisions}`);

    if (processId && processField) {
      statusBlocklistService.setIpsToDelete(processId, processField, totalDecisions);
    }

    if (alerts.length > 0) {
      let processedIps = 0;
      for (let i = 0; i < alerts.length; i++) {
        const alert = alerts[i];
        log.debug(`    Deleting alert ${alert.id} (${alert.decisions?.length || 0} decisions) for "${name}"`);
        await crowdSecAPI.alerts.deleteAlert(alert.id)
          .catch(() => { throw new Error(PROCESS_ERRORS.blocklistDisable.crowdSecAlertDeleteFailed); });
        processedIps += alert.decisions?.length ?? 0;
        if (processId && processField) {
          statusBlocklistService.setDeletedIps(processId, processField, processedIps);
        }
      }
      log.debug(`  Deleted ${alerts.length} alerts (${processedIps} decisions) for "${name}"`);
    }

    log.debug(`  Cleaning up local IPs for blocklist "${name}"...`);
    try {
      let totalDeleted = 0;
      await this.acquireWriteLock(async () => {
        while (true) {
          const chunk = await BlocklistIpsTable.findAll({
            attributes: ['id'],
            where: { [BlocklistIpsTable.col.blocklistId]: blocklist.id },
            limit: appDefaults.blocklists.blocklistIpsDeleteChunkSize,
          });
          if (chunk.length === 0) break;
          await BlocklistIpsTable.destroy({ where: { [BlocklistIpsTable.col.id]: chunk.map((ip) => ip.id) } });
          totalDeleted += chunk.length;
          log.debug(`    Deleted ${chunk.length} IP rows for "${name}" (total: ${totalDeleted})`);
          if (chunk.length < appDefaults.blocklists.blocklistIpsDeleteChunkSize) break;
        }
      });
      log.debug(`  Local DB cleanup complete for "${name}": ${totalDeleted} rows deleted`);
    } catch {
      throw new Error(PROCESS_ERRORS.blocklistDisable.dbCleanupFailed);
    }

    log.info(`Deleted alerts and IPs for blocklist "${name}"`);
  }

  /**
   * Refresh every enabled blocklist and push to CrowdSec.
   */
  async syncBlocklists(): Promise<{ refreshed: number; ips: number; errors: number; allowlistSkipped: number }> {
    let refreshed = 0;
    let ipsCount = 0;
    let errors = 0;
    let totalAllowlistSkipped = 0;

    const blocklists = await BlocklistsTable.findAll({ where: { enabled: true } });
    log.debug(`Found ${blocklists.length} enabled blocklist(s) to refresh`);

    if (blocklists.length === 0) {
      return { refreshed: 0, ips: 0, errors: 0, allowlistSkipped: 0 };
    }

    const processId = statusBlocklistService.createBlocklistRefreshProcess(blocklists.length);

    // Fetch allowlist entries once for all blocklists
    const allowlistEntries = await this.fetchAllowlistEntries();
    log.debug(`Using ${allowlistEntries.length} allowlist entries for filtering`);

    for (const blocklist of blocklists) {
      const idx = refreshed + errors + 1;
      log.debug(`Processing blocklist ${idx}/${blocklists.length}: "${blocklist.name}"`);

      try {
        const { allowlistSkipped } = await this.refreshBlocklist(blocklist, allowlistEntries);
        totalAllowlistSkipped += allowlistSkipped;
        ipsCount += await BlocklistIpsTable.count({ where: { [BlocklistIpsTable.col.blocklistId]: blocklist.id } });
        refreshed++;
        await this.acquireWriteLock(() =>
          blocklist.update({ last_refresh_failed: false })
        );
        statusBlocklistService.incrementRefreshBlocklist(processId, true);
        log.debug(`  Blocklist "${blocklist.name}" refreshed (${ipsCount} local IPs)`);
      } catch (err) {
        log.error(`Error refreshing blocklist "${blocklist.name}" (${blocklist.url}): ${err instanceof Error ? err.message : String(err)}`);
        errors++;
        await this.acquireWriteLock(() =>
          blocklist.update({ last_refresh_failed: true })
        );
        statusBlocklistService.incrementRefreshBlocklist(processId, false);
      }
    }

    statusBlocklistService.completeProcess(processId, errors === 0, errors > 0 ? PROCESS_ERRORS.blocklistRefresh.partialFailure : null);

    if (config.database.mode === DB_MODE.SQLITE) {
      log.debug('Running SQLite WAL checkpoint');
      await sequelize.query('PRAGMA wal_checkpoint(PASSIVE);');
    }

    log.debug(`Sync complete: ${refreshed} refreshed, ${ipsCount} total IPs, ${errors} errors, ${totalAllowlistSkipped} allowlist-skipped`);

    return { refreshed, ips: ipsCount, errors, allowlistSkipped: totalAllowlistSkipped };
  }
}

export const blocklistSyncService = new BlocklistSyncService();
