import type { AlertDelivery } from '../alerts/AlertDelivery.model';
import type { DecisionGroup } from '@/application/use-cases/decisions/decisions.dto';
import type { GetDecisionResponse } from './GetDecisionResponse.model';

export type DecisionSummary = Omit<GetDecisionResponse, 'source' | 'alert'> & {
  alert?: Omit<AlertDelivery, 'source'>;
};

export interface GetDecisionByIpResponse extends Omit<DecisionGroup, 'decisions'> {
  decisions: DecisionSummary[];
}
