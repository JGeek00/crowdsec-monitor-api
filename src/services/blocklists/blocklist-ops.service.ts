import { BlocklistsTable } from '@/models';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import { statusService } from '@/services/status.service';
import type { ProcessFieldBlocklist, ProcessFieldBlocklistOps } from '@/types/process.types';
import { buildAllowlistMatcher } from '@/utils/ip';
import { parseBlocklistContent } from '@/utils/parse-blocklist';
import { PROCESS_ERRORS } from '@/constants/process-errors';
import { log } from '@/services/log.service';
import { blocklistCrowdSecService } from '@/services/blocklists/blocklist-crowdsec.service';
import { blocklistDbService } from '@/services/blocklists/blocklist-db.service';

/**
 * Parse IPs and apply allowlist filter.
 */
async function parseIps(ips: string[], name: string, entries: string[]): Promise<string[]> {
  const isAllowlisted = buildAllowlistMatcher(entries);
  const filtered = ips.filter((ip) => !isAllowlisted(ip));
  const skipped = ips.length - filtered.length;

  if (skipped > 0) {
    log.debug(`  Allowlist filtering "${name}": ${skipped} skipped (${entries.length} allowlist entries)`);
  }

  return filtered;
}

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
      const filteredIps = await parseIps(ips, name, entries);
      allowlistSkipped = ips.length - filteredIps.length;

      // ── Deduplicate against active CrowdSec decisions ─────────
      let activeDecisions: Set<string>;
      try {
        activeDecisions = await crowdSecAPI.decisions.getActiveDecisions();
        crowdSecAPI.setBouncerConnected(true);
        statusService.updateBouncerStatus(true);
        log.debug(`  Fetched ${activeDecisions.size} active decisions from CrowdSec`);
      } catch {
        log.error(`Failed to fetch active decisions from CrowdSec. Aborting import for "${name}".`);
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
}

export const blocklistOpsService = new BlocklistOpsService();
