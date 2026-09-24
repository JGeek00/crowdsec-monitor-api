import { AlertDelivery, DecisionGroup, GetDecisionResponse } from '@/models';

export type DecisionSummary = Omit<GetDecisionResponse, 'source' | 'alert'> & {
  alert?: Omit<AlertDelivery, 'source'>;
};

export interface GetDecisionByIpResponse extends Omit<DecisionGroup, 'decisions'> {
  decisions: DecisionSummary[];
}
