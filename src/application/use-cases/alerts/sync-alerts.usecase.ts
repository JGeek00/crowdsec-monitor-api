import { alertsSyncService } from '@/services/alerts-sync.service';

export interface SyncAlertsResult {
  synced: number;
  updated: number;
  errors: number;
  decisions: number;
}

/**
 * Syncs alerts (and their decisions) from the CrowdSec LAPI into the local DB.
 *
 * Strangler note (T7): the fetch → upsert → notify → cleanup pipeline still
 * lives in the legacy alerts-sync.service (writeLock, notification engine and
 * retention cleanup move behind ports/UoW in T10). This use case is the
 * application-facing entry point so jobs and controllers already depend on
 * the port-shaped API.
 */
// Called by: delivery/http controllers (alerts/decisions delete), application/jobs/sync-alerts.job
export class SyncAlertsUseCase {
  execute(): Promise<SyncAlertsResult> {
    return alertsSyncService.syncAlerts();
  }
}

export const syncAlertsUseCase = new SyncAlertsUseCase();
