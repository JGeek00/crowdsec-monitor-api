import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { databaseService, statusService } from '@/services';
import appDefaults from '@/constants/app-defaults';
import type { SyncAlertsResult } from './sync-alerts.job';

export interface JobDefinition {
  /** Stable id (appDefaults.scheduler keys). */
  id: string;
  everySeconds: number;
  runOnBoot: boolean;
  /** Optional wall-clock timeout per run; undefined = unbounded (legacy behaviour). */
  timeoutMs?: number;
  /** Concurrency policy: skip the run if the previous one is still active. */
  overlap: 'skip';
  run: () => Promise<unknown>;
}

/**
 * LAPI health check job: polls the LAPI status and updates the status store.
 */
export const buildLapiHealthJob = (): JobDefinition => ({
  id: appDefaults.scheduler.lapiCheck,
  everySeconds: 60, // overridden by registry from config
  runOnBoot: false,
  overlap: 'skip',
  run: async (): Promise<boolean> => {
    await crowdSecAPI.checkStatus();
    statusService.updateLapiStatus(
      crowdSecAPI.getLastLapiConnected(),
      databaseService.getLastSuccessfulSync()?.toISOString() ?? null,
    );
    return true;
  },
});

export type { SyncAlertsResult };
