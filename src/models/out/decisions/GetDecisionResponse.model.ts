import { Alert, Decision, ParsedMetaData } from '@/models';

export interface GetDecisionResponse extends Decision {
  alert?: Alert<ParsedMetaData>;
}
