import { BlocklistsTable } from '@/models';
import { sequelize } from '@/config/database';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import { statusService } from '@/services/status.service';
import type { ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';
import { PROCESS_BLOCKLIST_REFRESH_STEP } from '@/types/process.types';
import { countIpsInValue } from '@/utils/ip-count';
import { buildAllowlistMatcher } from '@/utils/ip';
import { parseBlocklistContent } from '@/utils/parse-blocklist';
import { config } from '@/config';
import { DB_MODE } from '@/types/database.types';
import { PROCESS_ERRORS } from '@/constants/process-errors';
import { log } from '@/services/log.service';
import { blocklistCrowdSecService } from '@/services/blocklists/blocklist-crowdsec.service';
import { blocklistDbService } from '@/services/blocklists/blocklist-db.service';
import { executeSyncStep, importBlocklistToCrowdSec } from '@/helpers/blocklist-sync-steps';

class BlocklistSyncService {
  /**
   * Parse IPs and apply allowlist filter.
   */
  private async parseIps(ips: string[], blocklistName: string, allowlistEntries: string[]): Promise<string[]> {
    const isAllowlisted = buildAllowlistMatcher(allowlistEntries);
    const allowlistFiltered = ips.filter((ip) => !isAllowlisted(ip));
    const allowlistSkipped = ips.length - allowlistFiltered.length;

    if (allowlistSkipped > 0) {
      log.debug(
        `  Allowlist filtering "${blocklistName}": ${allowlistSkipped} skipped (${allowlistEntries.length} allowlist entries)`,
      );
    }

    return allowlistFiltered;
  }

  /* ── Public API ───────────────────────────────────────────────── */

  /**
   * Fetch a blocklist URL, store IPs in the local DB, and push to CrowdSec.
   * Deduplicates against active CrowdSec decisions (incremental push).
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
    let uniqueNewIps: string[] = [];
    let ips: string[] = [];
    let success = false;

    try {
      // ── Download ──────────────────────────────────────────────
      const { rawContent } = await blocklistCrowdSecService.downloadBlocklist(blocklistsTableEntry.url, name);
      ips = parseBlocklistContent(rawContent);

      if (processId && processField) {
        statusBlocklistService.markFetched(processId, processField);
      }

      // ── Filter by allowlist ───────────────────────────────────
      const entries = allowlistEntries ?? (await blocklistCrowdSecService.fetchAllowlistEntries());
      const filteredIps = await this.parseIps(ips, name, entries);
      allowlistSkipped = ips.length - filteredIps.length;

      // ── Deduplicate against active CrowdSec decisions ─────────
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
      const alreadyBlocked = filteredIps.length - uniqueNewIps.length;

      if (alreadyBlocked > 0) {
        log.debug(`  "${name}": ${alreadyBlocked} IPs already blocked in CrowdSec`);
      }
      log.debug(`  "${name}": ${uniqueNewIps.length} new IPs ready to push`);

      if (processId && processField) {
        statusBlocklistService.markParsed(processId, processField, uniqueNewIps.length);
      }

      // ── Write all IPs to DB (full list, not just unique) ──────
      await blocklistDbService.writeIpsToDb(blocklistsTableEntry, ips);

      // ── Push only unique new IPs to CrowdSec ──────────────────
      if (uniqueNewIps.length > 0) {
        await blocklistCrowdSecService.pushIpsToCrowdSec(uniqueNewIps, name, (chunkLength) => {
          if (processId && processField) {
            statusBlocklistService.addImportedIps(processId, processField, chunkLength);
          }
        });
      } else {
        log.debug(`  No new IPs to push for "${name}" (all already blocked in CrowdSec)`);
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
        const alreadyBlocked = ips.length - uniqueNewIps.length;
        const parts = [
          `${uniqueNewIps.length} pushed to CrowdSec`,
          alreadyBlocked > 0 ? `${alreadyBlocked} already blocked` : null,
          allowlistSkipped > 0 ? `${allowlistSkipped} in allowlist` : null,
        ]
          .filter(Boolean)
          .join(', ');
        log.info(`Refreshed "${name}": ${ips.length} IPs in list — ${parts}`);
      }

      await blocklistDbService.updateRefreshMetadata(blocklistsTableEntry, updatePayload);
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

    const { totalDecisions } = await blocklistCrowdSecService.deleteBlocklistAlerts(
      name,
      (alertId, decisionsCount, processedIps) => {
        if (processId && processField) {
          statusBlocklistService.setDeletedIps(processId, processField, processedIps);
        }
      },
    );

    if (processId && processField) {
      statusBlocklistService.setIpsToDelete(processId, processField, totalDecisions);
    }

    await blocklistDbService.deleteBlocklistIps(blocklist);

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
      await blocklistCrowdSecService.verifyConnection();
      crowdSecAPI.setBouncerConnected(true);
      statusService.updateBouncerStatus(true);
      log.debug('CrowdSec API connection verified');
    } catch {
      log.error('Cannot connect to CrowdSec API. Aborting blocklist sync.');
      crowdSecAPI.setBouncerConnected(false);
      statusService.updateBouncerStatus(false);
      for (const blocklist of blocklists) {
        await blocklistDbService.updateRefreshMetadata(blocklist, {
          last_refresh_failed: true,
          last_refresh_attempt: new Date(),
        });
      }
      statusBlocklistService.completeProcess(processId, false, PROCESS_ERRORS.blocklistRefresh.crowdSecUnavailable);
      return { refreshed: 0, totalIps: 0, errors: { fetch: [], parse: [], delete: [], import: [] } };
    }

    // Fetch allowlist entries once for all blocklists
    const allowlistEntries = await blocklistCrowdSecService.fetchAllowlistEntries();
    log.debug(`Using ${allowlistEntries.length} allowlist entries for filtering`);

    // Content cache: blocklist name → IPs (persist step results)
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

      // ── FETCH ────────────────────────────────────────────────
      if (
        !(await executeSyncStep(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.FETCH, blocklist, errors, async () => {
          const { rawContent } = await blocklistCrowdSecService.downloadBlocklist(blocklist.url, blocklist.name);
          fetchedIpsCache.set(blocklist.name, parseBlocklistContent(rawContent));
        }))
      )
        continue;

      // ── PARSE ────────────────────────────────────────────────
      if (
        !(await executeSyncStep(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.PARSE, blocklist, errors, async () => {
          const ips = fetchedIpsCache.get(blocklist.name) ?? [];
          const filteredIps = await this.parseIps(ips, blocklist.name, allowlistEntries);
          parsedIpsCache.set(blocklist.name, filteredIps);
        }))
      )
        continue;

      // ── DELETE old CrowdSec alerts ───────────────────────────
      if (
        !(await executeSyncStep(processId, i, PROCESS_BLOCKLIST_REFRESH_STEP.DELETE, blocklist, errors, async () => {
          await blocklistCrowdSecService.deleteBlocklistAlerts(blocklist.name);
        }))
      )
        continue;

      // ── IMPORT to CrowdSec ───────────────────────────────────
      const importSuccess = await executeSyncStep(
        processId,
        i,
        PROCESS_BLOCKLIST_REFRESH_STEP.IMPORT,
        blocklist,
        errors,
        async () => {
          const filteredIps = parsedIpsCache.get(blocklist.name) ?? [];
          const { ipsInDb, pushed } = await importBlocklistToCrowdSec(blocklist, filteredIps);
          statusBlocklistService.addBlocklistIps(processId, ipsInDb);

          const totalIpCount = filteredIps.reduce((sum: number, v: string) => sum + countIpsInValue(v), 0);
          log.info(
            `Refreshed "${blocklist.name}": ${filteredIps.length} lines, ${totalIpCount} IPs — ${pushed} pushed to CrowdSec`,
          );
        },
      );

      if (importSuccess) {
        await blocklistDbService.updateRefreshMetadata(blocklist, {
          last_successful_refresh: new Date(),
          last_refresh_failed: false,
          last_refresh_attempt: new Date(),
        });
        refreshed++;
      }
    }

    const hasErrors = Object.values(errors).some((arr) => arr.length > 0);
    statusBlocklistService.completeProcess(
      processId,
      !hasErrors,
      hasErrors ? PROCESS_ERRORS.blocklistRefresh.partialFailure : null,
    );

    if (config.database.mode === DB_MODE.SQLITE) {
      log.debug('Running SQLite WAL checkpoint');
      await sequelize.query('PRAGMA wal_checkpoint(PASSIVE);');
    }

    // Read totalIps from process state
    const process = statusBlocklistService.getProcessById(processId);
    const totalIps = process?.blocklistRefresh?.totalIps ?? 0;

    log.debug(
      `Sync complete: ${refreshed} refreshed, ${totalIps} total IPs, ${errors.fetch.length} fetch errors, ${errors.parse.length} parse errors, ${errors.delete.length} delete errors, ${errors.import.length} import errors`,
    );

    return { refreshed, totalIps, errors };
  }
}

export const blocklistSyncService = new BlocklistSyncService();
