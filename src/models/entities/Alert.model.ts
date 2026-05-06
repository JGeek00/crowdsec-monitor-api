import { MetaData } from "@/models";

// T must be of type `UnparsedMetaData` or `ParsedMetaData`
export interface Alert<T extends MetaData> {
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
  source: Alert_SourceInfo;
  labels: string[] | null;
  meta: T[];
  events: Alert_EventData<T>[];
  crowdsec_created_at: Date;
  start_at: Date;
  stop_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Alert_SourceInfo {
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

export interface Alert_EventData<T> {
  timestamp: string;
  meta: T[];
}
