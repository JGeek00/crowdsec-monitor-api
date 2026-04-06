import type { SourceInfo } from '@/models/Alert';
import type { DecisionAttributes } from '@/models/Decision';
import type { Decision } from '@/models/Decision';
import type { AlertWithParsedMeta } from './alert.interface';
import type { PaginationInfo } from './pagination.interface';

// Type for raw query results where JSON source field may be an unparsed string (raw: true in SQLite)
export type DecisionRaw = {
  source?: SourceInfo | string;
};

export type DecisionResponse = DecisionAttributes & {
  alert?: AlertWithParsedMeta;
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