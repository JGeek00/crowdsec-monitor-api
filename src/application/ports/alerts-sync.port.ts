// Implemented by: infrastructure/sync/alerts-sync
// Called by: application/use-cases/alerts/sync-alerts.usecase, composition root (jobs)
export interface SyncAlertsSummary {
  synced: number;
  updated: number;
  errors: number;
  decisions: number;
}

/** Pulls alerts + decisions from the LAPI into the local DB (retention cleanup included). */
export interface AlertsSyncPort {
  syncAlerts(): Promise<SyncAlertsSummary>;
  syncAll(): Promise<{ alerts: SyncAlertsSummary }>;
  syncDecisions(): Promise<{ synced: number; errors: number }>;
  cleanupOldData(): Promise<{ deletedAlerts: number; deletedDecisions: number }>;
  getLastSuccessfulSync(): Date | null;
}
