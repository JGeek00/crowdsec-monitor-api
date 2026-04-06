import type { AlertAttributes, MetaData, EventData, SourceInfo } from '@/models/Alert';
import type { DecisionAttributes } from '@/models/Decision';
import type { PaginationInfo } from './pagination.interface';

export interface ParsedMetaData {
  key: string;
  value: string[];
}

// Type for raw query results where JSON fields may be unparsed strings (raw: true in SQLite)
export type AlertRaw = {
  scenario?: string;
  source?: SourceInfo | string;
  events?: EventData[] | string;
  crowdsec_created_at?: Date | string;
};

export interface AlertFilteringInfo {
  countries: string[];
  scenarios: string[];
  ipOwners: string[];
  targets: string[];
}

export type AlertWithParsedMeta = Omit<AlertAttributes, 'meta' | 'events'> & {
  meta: ParsedMetaData[];
  events: Array<Omit<EventData, 'meta'> & { meta: ParsedMetaData[] }>;
};

export type AlertResponse = AlertWithParsedMeta & {
  decisions?: DecisionAttributes[];
};

export interface AlertListResponse {
  filtering: AlertFilteringInfo;
  items: Record<string, unknown>[];
  pagination?: PaginationInfo;
  total?: number;
}

// Re-export model types used alongside these interfaces
export type { MetaData, EventData, SourceInfo };
