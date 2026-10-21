import type { CrowdSecAlert, CrowdSecCreateAlertPayload } from '@/shared/crowdsec.types';

// Implemented by: infrastructure/crowdsec/http-lapi-client.ts
// Called by: application/use-cases/alerts/*, application/use-cases/status/*, application/use-cases/blocklists/*, application/jobs/*
export interface LapiAlertsParams {
  origin?: string;
  scenario?: string;
  since?: string;
  until?: string;
  has_active_decision?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface LapiClient {
  /** Logs in and returns true when the LAPI answers. */
  testConnection(): Promise<boolean>;
  checkStatus(): Promise<boolean>;
  getLastLapiConnected(): boolean;
  /** Fetches alerts (and their decisions) from the LAPI. */
  getAlerts(params?: LapiAlertsParams): Promise<CrowdSecAlert[]>;
  deleteAlert(id: number): Promise<number>;
  /** Creates alerts (used by manual decisions and blocklist imports). */
  createAlerts(payload: CrowdSecCreateAlertPayload): Promise<string[]>;
  /** Deletes a decision from the LAPI; returns number of deleted rows. */
  deleteDecision(id: number): Promise<number>;
  /** Allowlists (CrowdSec LAPI). */
  getAllowlists(): Promise<import('@/shared/crowdsec.types').CrowdSecAllowlist[]>;
  getAllowlistByName(name: string): Promise<import('@/shared/crowdsec.types').CrowdSecAllowlist | null>;
  checkAllowlist(ips: string[]): Promise<Array<{ ip: string; allowlist: string | null }>>;
  /** Allowlist entries for lookup checks. */
  fetchAllowlistEntries(): Promise<string[]>;
  /** Bouncer-key reachability probe (legacy crowdSecAPI surface). */
  checkBouncerConnection(): Promise<void>;
  isBouncerConnected(): boolean;
}
