import { BlocklistsTable } from '@/models';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { blocklistDbService } from '@/services/blocklists/blocklist-db.service';
import { blocklistCrowdSecService } from '@/services/blocklists/blocklist-crowdsec.service';
import {
  PROCESS_BLOCKLIST_STEP,
  PROCESS_BLOCKLIST_STEP_STATUS,
  type ProcessBlocklistRefreshStep,
  type ProcessBlocklistStep,
  type ProcessBlocklistStepStatus,
} from '@/types/process.types';
import { filterAllowlistedIps } from '@/utils/blocklist-allowlist-filter';
import { parseBlocklistContent } from '@/utils/parse-blocklist';

export interface BlocklistRefreshReporter {
  onStep(step: ProcessBlocklistRefreshStep, status: ProcessBlocklistStepStatus): void;
  onParsed(totalIps: number): void;
  onImportProgress(chunkSize: number): void;
}

async function stepFetchBlocklist(blocklist: BlocklistsTable): Promise<string[]> {
  const { rawContent } = await blocklistCrowdSecService.downloadBlocklist(blocklist.url, blocklist.name);
  return parseBlocklistContent(rawContent);
}

async function stepDeleteAlerts(blocklistName: string): Promise<void> {
  await blocklistCrowdSecService.deleteBlocklistAlerts(blocklistName);
}

async function stepImportAlerts(
  blocklist: BlocklistsTable,
  filteredIps: string[],
  onChunk?: (size: number) => void,
): Promise<{ pushed: number }> {
  const activeDecisions = await crowdSecAPI.decisions.getActiveDecisions();
  const uniqueNewIps = [...new Set(filteredIps.filter((ip) => !activeDecisions.has(ip)))];

  await blocklistDbService.writeIpsToDb(blocklist, filteredIps);

  let pushed = 0;
  if (uniqueNewIps.length > 0) {
    pushed = await blocklistCrowdSecService.pushIpsToCrowdSec(uniqueNewIps, blocklist.name, onChunk);
  }

  return { pushed };
}

async function runStep(
  step: ProcessBlocklistStep,
  reporter: BlocklistRefreshReporter,
  operation: () => Promise<void> | void,
): Promise<void> {
  reporter.onStep(step, PROCESS_BLOCKLIST_STEP_STATUS.RUNNING);
  try {
    await operation();
    reporter.onStep(step, PROCESS_BLOCKLIST_STEP_STATUS.SUCCESSFUL);
  } catch (err) {
    reporter.onStep(step, PROCESS_BLOCKLIST_STEP_STATUS.FAILED);
    throw err;
  }
}

/**
 * Core blocklist refresh workflow: fetch → parse → delete → import.
 * Reporting is delegated to the provided reporter.
 */
export async function runBlocklistRefreshPipeline(
  blocklist: BlocklistsTable,
  allowlistEntries: string[],
  reporter: BlocklistRefreshReporter,
): Promise<{ pushed: number }> {
  const step = PROCESS_BLOCKLIST_STEP;
  let ips: string[] = [];
  let filteredIps: string[] = [];

  await runStep(step.FETCH, reporter, async () => {
    ips = await stepFetchBlocklist(blocklist);
  });

  await runStep(step.PARSE, reporter, () => {
    filteredIps = filterAllowlistedIps(ips, blocklist.name, allowlistEntries);
    reporter.onParsed(filteredIps.length);
  });

  await runStep(step.DELETE, reporter, async () => {
    await stepDeleteAlerts(blocklist.name);
  });

  let pushed = 0;
  await runStep(step.IMPORT, reporter, async () => {
    const result = await stepImportAlerts(blocklist, filteredIps, (chunkSize) => {
      reporter.onImportProgress(chunkSize);
    });
    pushed = result.pushed;
  });

  return { pushed };
}
