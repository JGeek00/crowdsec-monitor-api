import type { Decision } from '@/domain/entities';

/** Distinct countries / ip owners present in decision sources (list `filtering`). */
export interface FilteringInfo {
  countries: string[];
  ipOwners: string[];
}

/** Query params accepted by the decisions list endpoints (input DTO). */
export interface GetDecisionsQueryParams {
  limit?: number;
  offset?: number;
  unpaged?: boolean;
  type?: string;
  scope?: string;
  value?: string;
  simulated?: boolean;
  scenario?: string;
  ip_address?: string;
  country?: string;
  ip_owner?: string;
  only_active?: boolean;
}

/** Decisions grouped by source IP (output DTO built by the grouping helper). */
export interface DecisionGroup {
  ip: string;
  country?: string;
  owner?: string;
  as_number?: string;
  latitude?: number;
  longitude?: number;
  range?: string;
  active_decisions: number;
  total_decisions: number;
  // Grouping helper works on raw Decision rows; when decisions are delivered,
  // controllers canonicalize them into DecisionSummary (timestamp fields as
  // canonical strings) before the response is built.
  decisions?: Decision[];
}
