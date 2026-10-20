import appDefaults from '@/constants/app-defaults';
import type { SyncAlertsUseCase } from '@/application/use-cases/alerts/sync-alerts.usecase';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { StatusStore } from '@/application/ports/status-store.port';
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
export const buildLapiHealthJob = (deps: {
  lapiClient: Pick<LapiClient, 'checkStatus' | 'getLastLapiConnected'>;
  syncAlerts: Pick<SyncAlertsUseCase, 'getLastSuccessfulSync'>;
  statusStore: Pick<StatusStore, 'updateLapi'>;
}): JobDefinition => ({
  id: appDefaults.scheduler.lapiCheck,
  everySeconds: 60, // overridden by registry from config
  runOnBoot: false,
  overlap: 'skip',
  run: async (): Promise<boolean> => {
    await deps.lapiClient.checkStatus();
    deps.statusStore.updateLapi(
      deps.lapiClient.getLastLapiConnected(),
      deps.syncAlerts.getLastSuccessfulSync()?.toISOString() ?? null,
    );
    return true;
  },
});

export type { SyncAlertsResult };
