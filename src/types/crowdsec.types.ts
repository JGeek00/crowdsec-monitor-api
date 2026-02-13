// CrowdSec LAPI Response Types

export interface CrowdSecLoginResponse {
  code: number;
  expire: string;
  token: string;
}

// Meta key-value pair
export interface CrowdSecMeta {
  key: string;
  value: string;
}

// Event data within an alert
export interface CrowdSecEvent {
  timestamp: string;
  meta: CrowdSecMeta[];
}

// Source information for an alert
export interface CrowdSecSource {
  as_name?: string;
  as_number?: string;
  cn?: string;
  ip: string;
  latitude?: number;
  longitude?: number;
  range?: string;
  scope: string;
  value: string;
}

export interface CrowdSecAlert {
  id: number;
  uuid: string;
  scenario: string;
  scenario_version: string;
  scenario_hash: string;
  message: string;
  capacity: number;
  leakspeed: string;
  simulated: boolean;
  remediation: boolean;
  events_count: number;
  machine_id: string;
  source: CrowdSecSource;
  labels: string[] | null;
  meta: CrowdSecMeta[];
  events: CrowdSecEvent[];
  decisions?: CrowdSecDecision[];
  created_at: string;
  start_at: string;
  stop_at: string;
}

export interface CrowdSecDecision {
  id: number;
  origin: string;
  type: string;
  scope: string;
  value: string;
  duration: string;
  scenario: string;
  simulated: boolean;
}

export interface CrowdSecAPIResponse<T> {
  data: T;
  message?: string;
}

// Types for creating alerts (POST /v1/alerts)

export interface CrowdSecCreateDecision {
  type: string;
  duration: string;
  value: string;
  origin: string;
  scenario: string;
  scope: string;
  simulated?: boolean;
}

export interface CrowdSecCreateSource {
  scope: string;
  value: string;
  ip?: string;
  range?: string;
  as_name?: string;
  as_number?: string;
  cn?: string;
  latitude?: number;
  longitude?: number;
}

export interface CrowdSecCreateAlert {
  scenario: string;
  campaign_name?: string;
  message: string;
  events_count: number;
  start_at: string;
  stop_at: string;
  capacity: number;
  leakspeed: string;
  simulated: boolean;
  events: CrowdSecEvent[];
  scenario_hash: string;
  scenario_version: string;
  source: CrowdSecCreateSource;
  decisions?: CrowdSecCreateDecision[];
}

export type CrowdSecCreateAlertPayload = CrowdSecCreateAlert[];
