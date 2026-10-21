import type { GetDecisionsQueryParams } from '@/application/use-cases/decisions/decisions.dto';

export interface GetDecisionsByIpQueryParams extends GetDecisionsQueryParams {
  include_decisions?: boolean;
}
