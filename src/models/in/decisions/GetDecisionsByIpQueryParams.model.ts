import { GetDecisionsQueryParams } from '@/models';

export interface GetDecisionsByIpQueryParams extends GetDecisionsQueryParams {
  include_decisions?: boolean;
}
