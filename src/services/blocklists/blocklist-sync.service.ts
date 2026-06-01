import axios from 'axios';
import { BLOCKLIST_IP_ORIGIN, BlocklistIpsTable, BlocklistsTable } from '@/models';
import { sequelize } from '@/config/database';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import { statusService } from '@/services/status.service';
import type { ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';
import { PROCESS_BLOCKLIST_REFRESH_STEP } from '@/types/process.types';
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
   * Fetch a blocklist URL and parse into IPs.
   */
  private async downloadBlocklist(blocklistUrl: string, blocklistName: string): Promise<{ rawContent: string; ips: string[] }> {
    const response = await axios.get<string>(blocklistUrl, {
      responseType: 'text',
      timeout: 30000,
    }).catch(() => { throw new Error(PROCESS_ERRORS.blocklistImport.fetchFailed); });

    log.debug(`  Fetched "${blocklistName}": ${response.data.length} bytes`);
    const ips = parseBlocklistContent(response.data);

    const totalIpCount = ips.reduce((sum: number, v: string) => sum + countIpsInValue(v), 0);
    log.debug(`  Parsed "${blocklistName}": ${ips.length} lines, ${totalIpCount} total IPs`);

    return { rawContent: response.data, ips };
  }

  /**
   * Parse IPs and apply allowlist filter.
   */
  private async parseIps(ips: string[], blocklistName: string, allowlistEntries: string[]): Promise<string[]> {
    const isAllowlisted = buildAllowlistMatcher(allowlistEntries);
    const allowlistFiltered = ips.filter(ip => !isAllowlisted(ip));
    const allowlistSkipped = ips.length - allowlistFiltered.length;

    if (allowlistSkipped > 0) {
      log.debug(`  Allowlist filtering "${blocklistName}": ${allowlistSkipped} skipped (${allowlistEntries.length} allowlist entries)`);
    }

    return allowlistFiltered;
  }

  /**
   * Delete CrowdSec alerts for a blocklist (no DB cleanup).
   */
  private async deleteBlocklistCrowdSecAlerts(blocklistName: string): Promise<number> {
    log.debug(`  Deleting CrowdSec alerts for "${blocklistName}"...`);

    const scenario = `external/blocklist (${blocklistName})`;
    const alerts = await crowdSecAPI.alerts.getAlerts({
      origin: appDefaults.blocklists.importOrigin,
      scenario,
    }).catch(() => { throw new Error(PROCESS_ERRORS.blocklistDisable.crowdSecAlertsFetchFailed); });

    log.debug(`  Found ${alerts.length} alert(s) for "${blocklistName}"`);
    const totalDecisions = alerts.reduce((sum, a) => sum + (a.decisions?.length ?? 0), 0);

    if (alerts.length > 0) {
      for (const alert of alerts) {
        log.debug(`    Deleting alert ${alert.id} (${alert.decisions?.length || 0} decisions) for "${blocklistName}"`);
        await crowdSecAPI.alerts.deleteAlert(alert.id)
          .catch(() => { throw new Error(PROCESS_ERRORS.blocklistDisable.crowdSecAlertDeleteFailed); });
      }
      log.debug(`  Deleted ${alerts.length} alerts (${totalDecisions} decisions) for "${blocklistName}"`);
    }

    return totalDecisions;
  }

  /**
   * Full replace: delete DB IPs, write new IPs, delete CrowdSec alerts, push new decisions.
   */
  private async importBlocklistToCrowdSec(
    blocklist: BlocklistsTable,
    filteredIps: string[],
  ): Promise<{ ipsInDb: number; pushed: number }> {
    const name = blocklist.name;
    log.debug(`  Importing "${name}" to CrowdSec...`);

    // 1. Write all IPs to DB (replace)
    const dbChunkSize = defaults.blocklists.writeChunkSize;
    const dbChunkCount = Math.ceil(filteredIps.length / dbChunkSize);
    log.debug(`  Writing ${filteredIps.length} IPs to DB for "${name}" in ${dbChunkCount} chunk(s)`);

    try {
      await this.acquireWriteLock(async () => {
        await sequelize.transaction(async (t) => {
          await BlocklistIpsTable.destroy({ where: { [BlocklistIpsTable.col.blocklistId]: blocklist.id }, transaction: t });

          for (let i = 0; i < filteredIps.length; i += dbChunkSize) {
            const chunk = filteredIps.slice(i, i + dbChunkSize).map((value: string) => ({
              blocklist_id: blocklist.id,
              blocklist_name: blocklist.name,
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

    // 2. Push all IPs to CrowdSec (full replace)
    const scenario = `external/blocklist (${name})`;
    const pushChunkSize = config.blocklists.writeChunkSize ?? filteredIps.length;
    const batchCount = Math.ceil(filteredIps.length / Math.max(pushChunkSize, 1));

    let pushed = 0;

    if (filteredIps.length === 0) {
      log.debug(`  No IPs to push for "${name}"`);
    } else {
      log.debug(`  Pushing "${name}" to CrowdSec: ${filteredIps.length} IPs, ${batchCount} batch(es) of ${pushChunkSize}`);

      for (let i = 0; i < filteredIps.length; i += pushChunkSize) {
        const chunk = filteredIps.slice(i, i + pushChunkSize);

        const now = new Date().toISOString();
        const payload: CrowdSecCreateAlertPayload = [
          {
            capacity: 0,
            events: [],
            events_count: 1,
            leakspeed: '0',
            message: `Blocking ${filteredIps.length} IPs from list ${name}`,
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

        pushed += chunk.length;
        const batchNum = Math.floor(i / pushChunkSize) + 1;
        log.debug(`    Batch ${batchNum}/${batchCount} sent for "${name}" (${chunk.length} decisions)`);
      }
    }

    const ipsInDb = filteredIps.length;
    return { ipsInDb, pushed };
  }

  /**
   * Fetch a blocklist URL, store IPs in the local DB, and push to CrowdSec.
   * Used by create/toggle controllers.
   */
  async refreshBlocklist(
    blocklistsTableEntry: BlocklistsTable,
    allowlistEntries?: string[],
    processId?: string,
    processField?: ProcessFieldBlocklist,
  ): Promise<{ allowlistSkipped: number }> {
    const name = blocklistsTableEntry.name;
    log.debug(`Refreshing blocklist "${name}" from ${blocklistsTableEntry.url}...`);

    let allowlistSkipped = 0;
    let alreadyBlocked = 0;
    let uniqueNewIps: string[] = [];
    let ips: string[] = [];
    let success = false;

    try {
      const { ips: downloadedIps } = await this.downloadBlocklist(blocklistsTableEntry.url, name);
      ips = downloadedIps;

      if (processId && processField) {
        statusBlocklistService.markFetched(processId, processField);
      }

      const entries = allowlistEntries ?? await this.fetchAllowlistEntries();
      const filteredIps = await this.parseIps(ips, name, entries);
      allowlistSkipped = ips.length - filteredIps.length;

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
      uniqueNewIps = [...new Set(filteredIps.filter((ip) => !activeDecisions.has(ip)))];
      alreadyBlocked = filteredIps.length - uniqueNewIps.length;

      if (alreadyBlocked > 0) {
        log.debug(`  "${name}": ${alreadyBlocked} IPs already blocked in CrowdSec`);
      }

      log.debug(`  "${name}": ${uniqueNewIps.length} new IPs ready to push`);

      if (processId && processField) {
        statusBlocklistService.markParsed(processId, processField, uniqueNewIps.length);
      }

      // Save all IPs from the list to the DB
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
              message: `Blocking ${ips.length} IPs from list ${blocklistsTableEntry.name}`,
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

      success = true;

    } finally {
      const updatePayload: {
        last_refresh_attempt: Date;
        last_successful_refresh?: Date;
        last_refresh_failed: boolean;
      } = {
        last_refresh_attempt: new Date(),
        last_refresh_failed: !success,
      };

      if (success) {
        updatePayload.last_successful_refresh = new Date();
        const parts = [
          `${uniqueNewIps.length} pushed to CrowdSec`,
          alreadyBlocked > 0 ? `${alreadyBlocked} already blocked` : null,
          allowlistSkipped > 0 ? `${allowlistSkipped} in allowlist` : null,
        ].filter(Boolean).join(', ');
        log.info(`Refreshed "${name}": ${ips.length} IPs in list — ${parts}`);
      }

      await this.acquireWriteLock(() => blocklistsTableEntry.update(updatePayload));
    }

    return { allowlistSkipped };
  }

  /**
   * Delete all CrowdSec alerts for a blocklist and wipe its local IPs.
   * Used by disable/delete controllers.
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
   * Full refresh of all enabled blocklists: fetch → parse → delete old CrowdSec alerts → import new.
   * Replaces all IPs in both CrowdSec and DB for each blocklist (no merge).
   */
  async syncBlocklists(): Promise<{
    refreshed: number;
    totalIps: number;
    errors: { fetch: string[]; parse: string[]; delete: string[]; import: string[] };
  }> {
    const blocklists = await BlocklistsTable.findAll({ where: { enabled: true } });
    log.debug(`Found ${blocklists.length} enabled blocklist(s) to refresh`);

    if (blocklists.length === 0) {
      return { refreshed: 0, totalIps: 0, errors: { fetch: [], parse: [], delete: [], import: [] } };
    }

    // Create process FIRST to activate sync lock immediately (prevents race with controllers)
    const processId = statusBlocklistService.createBlocklistRefreshProcess(
      blocklists.map((bl, idx) => ({ number: idx + 1, name: bl.name })),
    );

    // Verify CrowdSec API + bouncer connection before starting
    try {
      await crowdSecAPI.alerts.getAlerts({});
      crowdSecAPI.setBouncerConnected(true);
      statusService.updateBouncerStatus(true);
      log.debug('CrowdSec API connection verified');
    } catch {
      log.error('Cannot connect to CrowdSec API. Aborting blocklist sync.');
      crowdSecAPI.setBouncerConnected(false);
      statusService.updateBouncerStatus(false);
      // Mark all blocklists as failed since sync could not start
      for (const blocklist of blocklists) {
        await this.acquireWriteLock(() => blocklist.update({ last_refresh_failed: true, last_refresh_attempt: new Date() }));
      }
      statusBlocklistService.completeProcess(processId, false, PROCESS_ERRORS.blocklistRefresh.crowdSecUnavailable);
      return { refreshed: 0, totalIps: 0, errors: { fetch: [], parse: [], delete: [], import: [] } };
    }

    // Fetch allowlist entries once for all blocklists
    const allowlistEntries = await this.fetchAllowlistEntries();
    log.debug(`Using ${allowlistEntries.length} allowlist entries for filtering`);

    // Content cache: blocklist name → raw IPs (avoid re-downloading)
    const fetchedIpsCache = new Map<string, string[]>();
    const parsedIpsCache = new Map<string, string[]>();

    const errors = {
      fetch: [] as string[],
      parse: [] as string[],
      delete: [] as string[],
      import: [] as string[],
    };
    let refreshed = 0;

    for (let i = 0; i < blocklists.length; i++) {
      const blocklist = blocklists[i];
      log.debug(`Processing blocklist ${i + 1}/${blocklists.length}: "${blocklist.name}"`);
      statusBlocklistService.setCurrentBlocklist(processId, i + 1);

      let shouldSkipRemaining = false;

      // ── STEP 1: FETCH ──────────────────────────────────────────────
      statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.FETCH, 'running');
      try {
        const { ips } = await this.downloadBlocklist(blocklist.url, blocklist.name);
        fetchedIpsCache.set(blocklist.name, ips);
        statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.FETCH, 'successful');
      } catch (err) {
        log.error(`  FETCH failed for "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`);
        statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.FETCH, 'failed');
        errors.fetch.push(blocklist.name);
        await this.acquireWriteLock(() => blocklist.update({ last_refresh_failed: true, last_refresh_attempt: new Date() }));
        shouldSkipRemaining = true;
      }

      if (shouldSkipRemaining) continue;

      // ── STEP 2: PARSE ──────────────────────────────────────────────
      statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.PARSE, 'running');
      try {
        const ips = fetchedIpsCache.get(blocklist.name) ?? [];
        const filteredIps = await this.parseIps(ips, blocklist.name, allowlistEntries);
        parsedIpsCache.set(blocklist.name, filteredIps);
        statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.PARSE, 'successful');
      } catch (err) {
        log.error(`  PARSE failed for "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`);
        statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.PARSE, 'failed');
        errors.parse.push(blocklist.name);
        await this.acquireWriteLock(() => blocklist.update({ last_refresh_failed: true, last_refresh_attempt: new Date() }));
        shouldSkipRemaining = true;
      }

      if (shouldSkipRemaining) continue;

      // ── STEP 3: DELETE old CrowdSec alerts ─────────────────────────
      statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.DELETE, 'running');
      try {
        await this.deleteBlocklistCrowdSecAlerts(blocklist.name);
        statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.DELETE, 'successful');
      } catch (err) {
        log.error(`  DELETE failed for "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`);
        statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.DELETE, 'failed');
        errors.delete.push(blocklist.name);
        await this.acquireWriteLock(() => blocklist.update({ last_refresh_failed: true, last_refresh_attempt: new Date() }));
        shouldSkipRemaining = true;
      }

      if (shouldSkipRemaining) continue;

      // ── STEP 4: IMPORT to CrowdSec ─────────────────────────────────
      statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.IMPORT, 'running');
      try {
        const filteredIps = parsedIpsCache.get(blocklist.name) ?? [];
        const { ipsInDb, pushed } = await this.importBlocklistToCrowdSec(blocklist, filteredIps);
        statusBlocklistService.addBlocklistIps(processId, ipsInDb);
        statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.IMPORT, 'successful');

        const totalIpCount = filteredIps.reduce((sum: number, v: string) => sum + countIpsInValue(v), 0);
        log.info(`Refreshed "${blocklist.name}": ${filteredIps.length} lines, ${totalIpCount} IPs — ${pushed} pushed to CrowdSec`);

        await this.acquireWriteLock(() =>
          blocklist.update({ last_successful_refresh: new Date(), last_refresh_failed: false, last_refresh_attempt: new Date() })
        );
        refreshed++;
      } catch (err) {
        log.error(`  IMPORT failed for "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`);
        statusBlocklistService.setBlocklistStepStatus(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.IMPORT, 'failed');
        errors.import.push(blocklist.name);
        await this.acquireWriteLock(() => blocklist.update({ last_refresh_failed: true, last_refresh_attempt: new Date() }));
      }
    }

    const hasErrors = Object.values(errors).some(arr => arr.length > 0);
    statusBlocklistService.completeProcess(processId, !hasErrors, hasErrors ? PROCESS_ERRORS.blocklistRefresh.partialFailure : null);

    if (config.database.mode === DB_MODE.SQLITE) {
      log.debug('Running SQLite WAL checkpoint');
      await sequelize.query('PRAGMA wal_checkpoint(PASSIVE);');
    }

    // Read totalIps from process state
    const process = statusBlocklistService.getProcessById(processId);
    const totalIps = process?.blocklistRefresh?.totalIps ?? 0;

    log.debug(`Sync complete: ${refreshed} refreshed, ${totalIps} total IPs, ${errors.fetch.length} fetch errors, ${errors.parse.length} parse errors, ${errors.delete.length} delete errors, ${errors.import.length} import errors`);

    return { refreshed, totalIps, errors };
  }
}

export const blocklistSyncService = new BlocklistSyncService();
