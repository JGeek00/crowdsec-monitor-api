import { AlertDelivery, DecisionDelivery } from '@/models';

export interface GetDecisionResponse extends DecisionDelivery {
  alert?: AlertDelivery;
}
