import type { AlertsSyncPort, SyncAlertsSummary } from '@/application/ports/alerts-sync.port';

// Called by: delivery/http controllers (alerts/decisions delete), application/jobs/sync-alerts.job
export class SyncAlertsUseCase {
  constructor(private readonly deps: { alertsSync: AlertsSyncPort }) {}

  execute(): Promise<SyncAlertsSummary> {
    return this.deps.alertsSync.syncAlerts();
  }

  /** Timestamp of the last successful LAPI pull (drives the status snapshot). */
  getLastSuccessfulSync(): Date | null {
    return this.deps.alertsSync.getLastSuccessfulSync();
  }
}
