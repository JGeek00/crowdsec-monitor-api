export interface PostDecisionBody {
  ip: string;
  duration: string;
  reason: string;
  type: DecisionType;
}

export const DECISION_TYPE = {
  BAN: 'ban',
  CAPTCHA: 'captcha',
  THROTTLE: 'throttle',
  ALLOW: 'allow',
} as const;
export type DecisionType = (typeof DECISION_TYPE)[keyof typeof DECISION_TYPE];
