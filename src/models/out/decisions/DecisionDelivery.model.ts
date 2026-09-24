import type { Decision } from '@/models';

/**
 * Decision as delivered in API responses: date-typed fields (`expiration`,
 * `crowdsec_created_at`) rendered in the canonical timestamp format.
 */
export type DecisionDelivery = Omit<Decision, 'expiration' | 'crowdsec_created_at'> & {
  expiration: string | null;
  crowdsec_created_at: string | null;
};
