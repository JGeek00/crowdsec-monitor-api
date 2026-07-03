import { BlocklistsTable } from '@/models';
import { sequelize } from '@/config/database';
import { statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import type { ProcessFieldBlocklist, ProcessBlocklistRefreshStep } from '@/types/process.types';
import {
  PROCESS_BLOCKLIST_STEP_STATUS,
  PROCESS_FIELD_BLOCKLIST,
} from '@/types/process.types';
import { config } from '@/config';
import { DB_MODE } from '@/types/database.types';
import { PROCESS_ERRORS } from '@/constants/process-errors';
import { log } from '@/services/log.service';
import { blocklistOpsService } from '@/services/blocklists/blocklist-ops.service';
import { blocklistDbService } from '@/services/blocklists/blocklist-db.service';
import { blocklistCrowdSecService } from '@/services/blocklists/blocklist-crowdsec.service';
import { syncOneBlocklist } from '@/helpers/blocklist-sync-steps';

class BlocklistSyncService {
  /**
   * Full refresh cycle. If `targetBlocklist` is provided, refreshes only that one.
   * Otherwise refreshes all enabled blocklists.
   */
  async syncBlocklists(targetBlocklist?: BlocklistsTable): Promise<{
    refreshed: number;
    totalIps: number;
    errors: { fetch: string[]; parse: string[]; delete: string[]; import: string[] };
  }> {
    if (targetBlocklist) {
      return this.syncSingleBlocklists(targetBlocklist);
    }
    return this.syncMultiBlocklists();
  }

  private async syncSingleBlocklists(blocklist: BlocklistsTable): Promise<{
    refreshed: number;
    totalIps: number;
    errors: { fetch: string[]; parse: string[]; delete: string[]; import: string[] };
  }> {
    const processId = statusBlocklistService.createBlocklistSingleRefreshProcess(blocklist.id, blocklist.name);
    const field = PROCESS_FIELD_BLOCKLIST.SINGLE_REFRESH;

    try {
      if (!(await blocklistOpsService.verifyConnection())) {
        statusBlocklistService.completeProcess(
          processId,
          false,
          PROCESS_ERRORS.blocklistSingleRefresh.crowdSecUnavailable,
        );
        return { refreshed: 0, totalIps: 0, errors: { fetch: [], parse: [], delete: [], import: [] } };
      }

      const allowlistEntries = await blocklistCrowdSecService.fetchAllowlistEntries();

      const { pushed } = await syncOneBlocklist(blocklist, allowlistEntries, {
        onStep: (step, status) => {
          this.trackSingleStep(processId, field, step, status);
        },
        onParsed: (totalIps) => {
          statusBlocklistService.markParsed(processId, field, totalIps);
        },
        onImportProgress: (chunkSize) => {
          statusBlocklistService.addImportedIps(processId, field, chunkSize);
        },
      });

      statusBlocklistService.markBlocklistOpComplete(processId, field);
      statusBlocklistService.completeProcess(processId, true);

      return { refreshed: 1, totalIps: pushed, errors: { fetch: [], parse: [], delete: [], import: [] } };
    } catch (err) {
      log.error(`Single refresh failed for "${blocklist.name}": ${err instanceof Error ? err.message : err}`);
      statusBlocklistService.completeProcess(processId, false, PROCESS_ERRORS.blocklistSingleRefresh.failed);
      return { refreshed: 0, totalIps: 0, errors: { fetch: [], parse: [], delete: [], import: [] } };
    }
  }

  private trackSingleStep(
    processId: string,
    field: ProcessFieldBlocklist,
    step: ProcessBlocklistRefreshStep,
    status: string,
  ): void {
    if (step === 'fetch' && status === PROCESS_BLOCKLIST_STEP_STATUS.SUCCESSFUL) {
      statusBlocklistService.markFetched(processId, field);
    } else if (step === 'parse' && status === PROCESS_BLOCKLIST_STEP_STATUS.RUNNING) {
      // markFetched already sets parsed=running
    } else if (step === 'delete' && status === PROCESS_BLOCKLIST_STEP_STATUS.SUCCESSFUL) {
      statusBlocklistService.markDeleted(processId, field);
    } else if (step === 'import' && status === PROCESS_BLOCKLIST_STEP_STATUS.RUNNING) {
      // markDeleted already sets imported=running
    }
  }

  private async syncMultiBlocklists(): Promise<{
    refreshed: number;
    totalIps: number;
    errors: { fetch: string[]; parse: string[]; delete: string[]; import: string[] };
  }> {
    const blocklists = await BlocklistsTable.findAll({ where: { enabled: true } });
    log.debug(`Found ${blocklists.length} enabled blocklist(s) to refresh`);

    if (blocklists.length === 0) {
      return { refreshed: 0, totalIps: 0, errors: { fetch: [], parse: [], delete: [], import: [] } };
    }

    const processId = statusBlocklistService.createBlocklistRefreshProcess(
      blocklists.map((bl, idx) => ({ number: idx + 1, name: bl.name })),
    );

    if (!(await blocklistOpsService.verifyConnection())) {
      for (const blocklist of blocklists) {
        await blocklistDbService.updateRefreshMetadata(blocklist, {
          last_refresh_failed: true,
          last_refresh_attempt: new Date(),
        });
      }
      statusBlocklistService.completeProcess(processId, false, PROCESS_ERRORS.blocklistRefresh.crowdSecUnavailable);
      return { refreshed: 0, totalIps: 0, errors: { fetch: [], parse: [], delete: [], import: [] } };
    }

    const allowlistEntries = await blocklistCrowdSecService.fetchAllowlistEntries();
    log.debug(`Using ${allowlistEntries.length} allowlist entries for filtering`);

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

      let failedStep: ProcessBlocklistRefreshStep | null = null;

      try {
        const { pushed } = await syncOneBlocklist(blocklist, allowlistEntries, {
          onStep: (step, status) => {
            statusBlocklistService.setBlocklistStepStatus(processId, i, step, status);
            if (status === PROCESS_BLOCKLIST_STEP_STATUS.FAILED) {
              failedStep = step;
            }
          },
          onParsed: () => {},
          onImportProgress: () => {},
        });
        statusBlocklistService.addBlocklistIps(processId, pushed);
        await blocklistDbService.updateRefreshMetadata(blocklist, {
          last_successful_refresh: new Date(),
          last_refresh_failed: false,
          last_refresh_attempt: new Date(),
        });
        refreshed++;
      } catch (err) {
        log.error(
          `  Sync failed for "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`,
        );
        await blocklistDbService.updateRefreshMetadata(blocklist, {
          last_refresh_failed: true,
          last_refresh_attempt: new Date(),
        });
        if (failedStep) {
          const stepKey = failedStep as keyof typeof errors;
          errors[stepKey].push(blocklist.name);
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
      `Sync complete: ${refreshed} refreshed, ${totalIps} total IPs, ${errors.fetch.length} fetch errors, ${errors.parse.length} parse errors, ${errors.delete.length} delete errors, ${errors.import.length} import errors`,
    );

    return { refreshed, totalIps, errors };
  }
}

export const blocklistSyncService = new BlocklistSyncService();
