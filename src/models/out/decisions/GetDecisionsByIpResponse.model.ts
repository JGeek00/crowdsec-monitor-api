import { DecisionGroup, Pagination } from '@/models';

export interface GetDecisionsByIpResponse {
  filtering: DecisionsByIpFiltering;
  groups: DecisionGroup[];
  pagination?: Pagination;
  total?: number;
}

export interface DecisionsByIpFiltering {
  countries: string[];
  ipOwners: string[];
}
