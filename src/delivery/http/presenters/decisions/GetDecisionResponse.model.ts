import type { AlertDelivery } from '../alerts/AlertDelivery.model';
import type { DecisionDelivery } from './DecisionDelivery.model';

export interface GetDecisionResponse extends DecisionDelivery {
  alert?: AlertDelivery;
}
