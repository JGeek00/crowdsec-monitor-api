import { Alert, DecisionGroup, GetDecisionResponse, ParsedMetaData } from '@/models';

export type DecisionSummary = Omit<GetDecisionResponse, 'source' | 'alert'> & {
  alert?: Omit<Alert<ParsedMetaData>, 'source'>;
};

export interface GetDecisionByIpResponse extends Omit<DecisionGroup, 'decisions'> {
  decisions: DecisionSummary[];
}
