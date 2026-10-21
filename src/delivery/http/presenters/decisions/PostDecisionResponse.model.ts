export interface PostDecisionResponse {
  message: string;
  alert_ids: string[];
  decision: {
    ip: string;
    type: string;
    duration: string;
    reason: string;
  };
}
