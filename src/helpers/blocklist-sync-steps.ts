import { BlocklistsTable } from '@/models';
import type { ProcessBlocklistRefreshStep } from '@/types/process.types';
import { statusBlocklistService } from '../services/blocklists/status-blocklist.service';
import { blocklistDbService } from '../services/blocklists/blocklist-db.service';
import { blocklistCrowdSecService } from '../services/blocklists/blocklist-crowdsec.service';
import { log } from '@/services/log.service';

/**
 * Step orchestration helpers for blocklist refresh operations.
 * Each step is wrapped with status tracking and error handling.
 */

/**
 * Execute a single sync step with status tracking and error handling.
 * Returns true if the step succeeded, false if it failed.
 */
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
 * Full replace: write IPs to DB, then push to CrowdSec.
 */
export async function importBlocklistToCrowdSec(
  blocklist: BlocklistsTable,
  filteredIps: string[],
): Promise<{ ipsInDb: number; pushed: number }> {
  log.debug(`  Importing "${blocklist.name}" to CrowdSec...`);

  await blocklistDbService.writeIpsToDb(blocklist, filteredIps);
  const pushed = await blocklistCrowdSecService.pushIpsToCrowdSec(filteredIps, blocklist.name);

  return { ipsInDb: filteredIps.length, pushed };
}
