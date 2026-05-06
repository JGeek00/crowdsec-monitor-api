import type { DecisionAttributes } from '@/models/db/Decision';
import type { Decision } from '@/models/db/Decision';
import type { PaginationInfo } from './pagination.interface';
import { Alert, Alert_SourceInfo, ParsedMetaData } from '@/models';

// Type for raw query results where JSON source field may be an unparsed string (raw: true in SQLite)
export type DecisionRaw = {
  source?: Alert_SourceInfo | string;
};

export type DecisionResponse = DecisionAttributes & {
  alert?: Alert<ParsedMetaData>;
};

export interface DecisionListResponse {
  filtering: {
    countries: string[];
    ipOwners: string[];
  };
  items: Decision[];
  pagination?: PaginationInfo;
  total?: number;
}

export const DECISION_TYPE = {
  BAN: 'ban',
  CAPTCHA: 'captcha',
  THROTTLE: 'throttle',
  ALLOW: 'allow',
} as const;
export type DecisionType = typeof DECISION_TYPE[keyof typeof DECISION_TYPE];


export interface CreateDecisionRequest {
  ip: string;
  duration: string;
  reason: string;
  type: DecisionType;
}