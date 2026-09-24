import { Decision, DecisionDelivery, Pagination } from '@/models';

export interface DecisionsFiltering {
  countries: string[];
  ipOwners: string[];
}

export interface GetDecisionsResponse {
  filtering: DecisionsFiltering;
  items: DecisionDelivery[];
  pagination?: Pagination;
  total?: number;
}

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
