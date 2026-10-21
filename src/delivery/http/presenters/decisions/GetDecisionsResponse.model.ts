import type { DecisionDelivery } from './DecisionDelivery.model';
import type { Pagination } from '@/shared/models';
import type { DecisionGroup } from '@/application/use-cases/decisions/decisions.dto';

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

export type { DecisionGroup };
