import appDefaults from '@/constants/app-defaults';
import type { SyncAlertsUseCase } from '@/application/use-cases/alerts/sync-alerts.usecase';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { StatusStore } from '@/application/ports/status-store.port';
import type { JobDefinition } from './check-lapi-health.job';

export interface SyncAlertsResult {
  alerts: { synced: number; updated: number; errors: number; decisions: number };
}

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
  run: async (): Promise<SyncAlertsResult> => {
    await deps.syncAlerts.execute();
    deps.statusStore.updateLapi(
      deps.lapiClient.getLastLapiConnected(),
      deps.syncAlerts.getLastSuccessfulSync()?.toISOString() ?? null,
    );
    return { alerts: { synced: 0, updated: 0, errors: 0, decisions: 0 } };
  },
});
