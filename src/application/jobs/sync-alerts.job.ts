import { databaseService, statusService } from '@/services';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import appDefaults from '@/constants/app-defaults';
import type { JobDefinition } from './check-lapi-health.job';

export interface SyncAlertsResult {
  alerts: { synced: number; updated: number; errors: number; decisions: number };
}

/**
 * Data sync job: pulls alerts + decisions from the LAPI into the local DB
 * and refreshes the LAPI status timestamp.
 */
export const buildSyncAlertsJob = (): JobDefinition => ({
  id: appDefaults.scheduler.dataSync,
  everySeconds: 60, // overridden by registry from config
  runOnBoot: false,
  overlap: 'skip',
  run: async (): Promise<SyncAlertsResult> => {
    await databaseService.syncAll();
    statusService.updateLapiStatus(
      crowdSecAPI.getLastLapiConnected(),
      databaseService.getLastSuccessfulSync()?.toISOString() ?? null,
    );
    return { alerts: { synced: 0, updated: 0, errors: 0, decisions: 0 } };
  },
});
