import { Decision, Pagination } from '@/models';

export interface DecisionsFiltering {
  countries: string[];
  ipOwners: string[];
}

export interface GetDecisionsResponse {
  filtering: DecisionsFiltering;
  items: Decision[];
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
  decisions?: Decision[];
}
