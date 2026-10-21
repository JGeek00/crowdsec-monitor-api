import type { DecisionGroup } from '@/application/use-cases/decisions/decisions.dto';
import type { Pagination } from '@/shared/models';

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
