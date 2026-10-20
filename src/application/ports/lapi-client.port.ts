// Implemented by: infrastructure/crowdsec/http-lapi-client.ts
// Called by: application/use-cases/alerts/sync-alerts, application/use-cases/status/*, application/jobs/*
export interface LapiClient {
  /** Logs in and returns true when the LAPI answers. */
  testConnection(): Promise<boolean>;
  checkStatus(): Promise<boolean>;
  getLastLapiConnected(): boolean;
  /** Downloads alerts (paginated) for the sync pipeline. */
  fetchAlerts(page: number, since: string | null): Promise<unknown[]>;
  /** Creates a manual decision (POST /decisions). */
  createDecision(payload: Record<string, unknown>): Promise<void>;
  deleteDecision(id: number): Promise<void>;
  /** Allowlist entries for lookup checks. */
  fetchAllowlistEntries(): Promise<string[]>;
}
