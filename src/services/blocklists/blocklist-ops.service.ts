import { BlocklistsTable } from '@/models';
import { sequelize } from '@/config/database';
import { config } from '@/config';
import { DB_MODE } from '@/types/database.types';
import { PROCESS_ERRORS } from '@/constants/process-errors';
import { log } from '@/services/log.service';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { statusService } from '@/services/status.service';
import { blocklistDbService } from '@/services/blocklists/blocklist-db.service';
import { blocklistCrowdSecService } from '@/services/blocklists/blocklist-crowdsec.service';
import { SingleRefreshReporter, statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import type { ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';
import { filterAllowlistedIps } from '@/utils/blocklist-allowlist-filter';
import { parseBlocklistContent } from '@/utils/parse-blocklist';
import { fetchAndDeduplicateIps, buildActivationSummary } from '@/helpers/blocklists/blocklist-activation';
import { processOneBlocklist } from '@/helpers/blocklists/blocklist-refresh';
import { runBlocklistRefreshPipeline } from '@/helpers/blocklists/blocklists-refresh-pipeline';

type RefreshErrors = { fetch: string[]; parse: string[]; delete: string[]; import: string[] };
type RefreshResult = { refreshed: number; totalIps: number; errors: RefreshErrors };

const emptyErrors = (): RefreshErrors => ({ fetch: [], parse: [], delete: [], import: [] });

class BlocklistOpsService {
  /**
   * Verify CrowdSec connection and update bouncer status.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await blocklistCrowdSecService.verifyConnection();
      crowdSecAPI.setBouncerConnected(true);
      statusService.updateBouncerStatus(true);
      log.debug('CrowdSec API connection verified');
      return true;
    } catch {
      log.error('Cannot connect to CrowdSec API. Aborting blocklist sync.');
      crowdSecAPI.setBouncerConnected(false);
      statusService.updateBouncerStatus(false);
      return false;
    }
  }

  /**
   * Fetch a blocklist URL, store IPs locally, and push to CrowdSec.
   * Deduplicates against active CrowdSec decisions (incremental push).
   * Used by create/toggle controllers.
   */
  async activateBlocklist(
    blocklistsTableEntry: BlocklistsTable,
    allowlistEntries?: string[],
    processId?: string,
    processField?: ProcessFieldBlocklist,
  ): Promise<{ allowlistSkipped: number }> {
    const name = blocklistsTableEntry.name;
    log.debug(`Activating blocklist "${name}" from ${blocklistsTableEntry.url}...`);

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
      const filteredIps = filterAllowlistedIps(ips, name, entries);
      allowlistSkipped = ips.length - filteredIps.length;

      // ── Deduplicate against active CrowdSec decisions ─────────
      ({ uniqueNewIps } = await fetchAndDeduplicateIps(filteredIps, name));

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
      const { metadata, logMessage } = buildActivationSummary(name, ips, uniqueNewIps, allowlistSkipped, success);
      if (logMessage) {
        log.info(logMessage);
      }
      await blocklistDbService.updateRefreshMetadata(blocklistsTableEntry, metadata);
    }

    return { allowlistSkipped };
  }

  /**
   * Delete all CrowdSec alerts for a blocklist and wipe local IPs.
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
      (_alertId, _decisionsCount, processedIps) => {
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
   * Full refresh cycle. If `targetBlocklist` is provided, refreshes only that one.
   * Otherwise refreshes all enabled blocklists.
   */
  async refreshBlocklists(targetBlocklist?: BlocklistsTable): Promise<RefreshResult> {
    if (targetBlocklist) {
      return this.singleBlocklist(targetBlocklist);
    }
    return this.allBlocklists();
  }

  // ───── PRIVATE FUNCTIONS ────────────────────────────────────────

  private async singleBlocklist(blocklist: BlocklistsTable): Promise<RefreshResult> {
    const processId = statusBlocklistService.createBlocklistSingleRefreshProcess(blocklist.id, blocklist.name);
    const reporter = new SingleRefreshReporter(processId);

    try {
      if (!(await this.verifyConnection())) {
        await this.updateRefreshOutcome(blocklist, false);
        statusBlocklistService.completeProcess(
          processId,
          false,
          PROCESS_ERRORS.blocklistSingleRefresh.crowdSecUnavailable,
        );
        return { refreshed: 0, totalIps: 0, errors: emptyErrors() };
      }

      const allowlistEntries = await blocklistCrowdSecService.fetchAllowlistEntries();
      const { pushed } = await runBlocklistRefreshPipeline(blocklist, allowlistEntries, reporter);

      await this.updateRefreshOutcome(blocklist, true);
      reporter.markComplete();
      statusBlocklistService.completeProcess(processId, true);

      return { refreshed: 1, totalIps: pushed, errors: emptyErrors() };
    } catch (err) {
      log.error(`Single sync failed for "${blocklist.name}": ${err instanceof Error ? err.message : err}`);
      await this.updateRefreshOutcome(blocklist, false);
      statusBlocklistService.completeProcess(processId, false, PROCESS_ERRORS.blocklistSingleRefresh.failed);
      return { refreshed: 0, totalIps: 0, errors: emptyErrors() };
    }
  }

  private async allBlocklists(): Promise<RefreshResult> {
    const blocklists = await BlocklistsTable.findAll({ where: { enabled: true } });
    log.debug(`Found ${blocklists.length} enabled blocklist(s) to refresh`);

    if (blocklists.length === 0) {
      return { refreshed: 0, totalIps: 0, errors: emptyErrors() };
    }

    const processId = statusBlocklistService.createBlocklistRefreshProcess(
      blocklists.map((bl, idx) => ({ number: idx + 1, name: bl.name })),
    );

    if (!(await this.verifyConnection())) {
      for (const blocklist of blocklists) {
        await this.updateRefreshOutcome(blocklist, false);
      }
      statusBlocklistService.completeProcess(processId, false, PROCESS_ERRORS.blocklistRefresh.crowdSecUnavailable);
      return { refreshed: 0, totalIps: 0, errors: emptyErrors() };
    }

    const allowlistEntries = await blocklistCrowdSecService.fetchAllowlistEntries();
    log.debug(`Using ${allowlistEntries.length} allowlist entries for filtering`);

    const errors = emptyErrors();
    let refreshed = 0;

    for (let i = 0; i < blocklists.length; i++) {
      const blocklist = blocklists[i];

      try {
        await processOneBlocklist(blocklist, allowlistEntries, processId, i, blocklists.length);
        await this.updateRefreshOutcome(blocklist, true);
        refreshed++;
      } catch (err) {
        log.error(`  Refresh failed for "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`);
        await this.updateRefreshOutcome(blocklist, false);
        const failedStep = (err as { failedStep?: 'fetch' | 'parse' | 'delete' | 'import' }).failedStep;
        if (failedStep) {
          errors[failedStep].push(blocklist.name);
        } else {
          errors.import.push(blocklist.name);
        }
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

    const process = statusBlocklistService.getProcessById(processId);
    const totalIps = process?.blocklistRefresh?.totalIps ?? 0;

    log.debug(
      `Refresh complete: ${refreshed} refreshed, ${totalIps} total IPs, ${errors.fetch.length} fetch errors, ${errors.parse.length} parse errors, ${errors.delete.length} delete errors, ${errors.import.length} import errors`,
    );

    return { refreshed, totalIps, errors };
  }

  private async updateRefreshOutcome(blocklist: BlocklistsTable, success: boolean): Promise<void> {
    await blocklistDbService.updateRefreshMetadata(blocklist, {
      last_refresh_attempt: new Date(),
      last_refresh_failed: !success,
      ...(success ? { last_successful_refresh: new Date() } : {}),
    });
  }
}

export const blocklistOpsService = new BlocklistOpsService();
