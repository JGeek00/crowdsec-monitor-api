// Implemented by: infrastructure/crowdsec/http-lapi-client.ts
// Called by: application/use-cases/alerts/*, application/use-cases/status/*, application/jobs/*
export interface LapiAlertsParams {
  origin?: string;
  scenario?: string;
  since?: string;
  until?: string;
  has_active_decision?: boolean;
  [key: string]: unknown;
}

export interface LapiClient {
  /** Logs in and returns true when the LAPI answers. */
  testConnection(): Promise<boolean>;
  checkStatus(): Promise<boolean>;
  getLastLapiConnected(): boolean;
  /** Fetches alerts (and their decisions) from the LAPI. */
  getAlerts(params?: LapiAlertsParams): Promise<unknown[]>;
  deleteAlert(id: number): Promise<number>;
  /** Allowlist entries for lookup checks. */
  fetchAllowlistEntries(): Promise<string[]>;
}
