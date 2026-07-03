import { BlocklistsTable } from '@/models';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import type { ProcessBlocklistRefreshStep, SyncOneCallbacks } from '@/types/process.types';
import { PROCESS_BLOCKLIST_REFRESH_STEP, PROCESS_BLOCKLIST_STEP_STATUS } from '@/types/process.types';
import { buildAllowlistMatcher } from '@/utils/ip';
import { parseBlocklistContent } from '@/utils/parse-blocklist';
import { statusBlocklistService } from '../services/blocklists/status-blocklist.service';
import { blocklistDbService } from '../services/blocklists/blocklist-db.service';
import { blocklistCrowdSecService } from '../services/blocklists/blocklist-crowdsec.service';
import { log } from '@/services/log.service';

export async function executeSyncStep(
  processId: string,
  index: number,
  step: ProcessBlocklistRefreshStep,
  blocklist: BlocklistsTable,
  errors: Record<string, string[]>,
  fn: () => Promise<void>,
): Promise<boolean> {
  statusBlocklistService.setBlocklistStepStatus(processId, index, step, 'running');

  try {
    await fn();
    statusBlocklistService.setBlocklistStepStatus(processId, index, step, 'successful');
    return true;
  } catch (err) {
    log.error(
      `  ${step.toUpperCase()} failed for "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`,
    );
    statusBlocklistService.setBlocklistStepStatus(processId, index, step, 'failed');
    errors[step].push(blocklist.name);
    await blocklistDbService.updateRefreshMetadata(blocklist, {
      last_refresh_failed: true,
      last_refresh_attempt: new Date(),
    });
    return false;
  }
}

/**
 * Parse IPs and apply allowlist filter.
 */
export async function parseIps(ips: string[], name: string, entries: string[]): Promise<string[]> {
  const isAllowlisted = buildAllowlistMatcher(entries);
  const filtered = ips.filter((ip) => !isAllowlisted(ip));
  const skipped = ips.length - filtered.length;

  if (skipped > 0) {
    log.debug(`  Allowlist filtering "${name}": ${skipped} skipped (${entries.length} allowlist entries)`);
  }

  return filtered;
}

/**
 * Core blocklist refresh: fetch → parse → delete → dedup → import.
 * Callbacks handle process tracking; the caller decides how to notify.
 */
export async function syncOneBlocklist(
  blocklist: BlocklistsTable,
  allowlistEntries: string[],
  callbacks?: SyncOneCallbacks,
): Promise<{ pushed: number }> {
  const name = blocklist.name;
  const step = PROCESS_BLOCKLIST_REFRESH_STEP;
  const status = PROCESS_BLOCKLIST_STEP_STATUS;

  // ── FETCH ──
  callbacks?.onStep(step.FETCH, status.RUNNING);
  const { rawContent } = await blocklistCrowdSecService.downloadBlocklist(blocklist.url, name);
  const ips = parseBlocklistContent(rawContent);
  callbacks?.onStep(step.FETCH, status.SUCCESSFUL);

  // ── PARSE ──
  callbacks?.onStep(step.PARSE, status.RUNNING);
  const filteredIps = await parseIps(ips, name, allowlistEntries);
  callbacks?.onStep(step.PARSE, status.SUCCESSFUL);
  callbacks?.onParsed(filteredIps.length);

  // ── DELETE ──
  callbacks?.onStep(step.DELETE, status.RUNNING);
  await blocklistCrowdSecService.deleteBlocklistAlerts(name);
  callbacks?.onStep(step.DELETE, status.SUCCESSFUL);

  // ── IMPORT ──
  callbacks?.onStep(step.IMPORT, status.RUNNING);
  const activeDecisions = await crowdSecAPI.decisions.getActiveDecisions();
  const uniqueNewIps = [...new Set(filteredIps.filter((ip: string) => !activeDecisions.has(ip)))];

  await blocklistDbService.writeIpsToDb(blocklist, filteredIps);

  let pushed = 0;
  if (uniqueNewIps.length > 0) {
    pushed = await blocklistCrowdSecService.pushIpsToCrowdSec(uniqueNewIps, name, (chunkSize) => {
      callbacks?.onImportProgress(chunkSize);
    });
  }

  callbacks?.onStep(step.IMPORT, status.SUCCESSFUL);
  return { pushed };
}
