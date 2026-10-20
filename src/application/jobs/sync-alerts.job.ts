import appDefaults from '@/constants/app-defaults';
import type { SyncAlertsUseCase } from '@/application/use-cases/alerts/sync-alerts.usecase';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { StatusStore } from '@/application/ports/status-store.port';
import type { JobDefinition, JobResult } from './check-lapi-health.job';

/**
 * Data sync job: pulls alerts + decisions from the LAPI into the local DB
 * and refreshes the LAPI status timestamp.
 */
export const buildSyncAlertsJob = (deps: {
  syncAlerts: SyncAlertsUseCase;
  lapiClient: Pick<LapiClient, 'getLastLapiConnected'>;
  statusStore: Pick<StatusStore, 'updateLapi'>;
}): JobDefinition => ({
  id: appDefaults.scheduler.dataSync,
  everySeconds: 60, // overridden by registry from config
  runOnBoot: false,
  overlap: 'skip',
  run: async (): Promise<JobResult> => {
    await deps.syncAlerts.execute();
    deps.statusStore.updateLapi(
      deps.lapiClient.getLastLapiConnected(),
      deps.syncAlerts.getLastSuccessfulSync()?.toISOString() ?? null,
    );
    return { skipped: false };
  },
});
