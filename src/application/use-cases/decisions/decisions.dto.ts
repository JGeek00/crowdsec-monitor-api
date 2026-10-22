import type { Alert, Decision } from '@/domain/entities';
import type { UnparsedMetaData } from '@/shared/meta-data';
import type { Pagination } from '@/shared/models';
import type { AlertDelivery } from '@/delivery/http/presenters/alerts/AlertDelivery.model';

/** Decision read model with its parent alert attached (`withAlert` queries). */
export interface DecisionWithAlert extends Decision {
  alert?: Alert<UnparsedMetaData> | null;
}

/** Distinct countries / ip owners present in decision sources (list `filtering`). */
export interface FilteringInfo {
  countries: string[];
  ipOwners: string[];
}

/** Query params accepted by the decisions list endpoints (input DTO). */
export interface GetDecisionsQueryParams {
  limit?: number;
  offset?: number;
  unpaged?: boolean;
  type?: string;
  scope?: string;
  value?: string;
  simulated?: boolean;
  scenario?: string;
  ip_address?: string;
  country?: string;
  ip_owner?: string;
  only_active?: boolean;
  include_decisions?: boolean;
  /** `yyyy-MM-dd:hh:mm:ss` (UTC) on the wire; the list use case normalizes it to a Date. */
  start_timestamp?: string | Date;
  /** `yyyy-MM-dd:hh:mm:ss` (UTC) on the wire; the list use case normalizes it to a Date. */
  end_timestamp?: string | Date;
}

/** Decision as delivered: date-typed fields rendered as canonical RFC 3339 strings. */
export type CanonicalDecision = Omit<DecisionWithAlert, 'expiration' | 'crowdsec_created_at'> & {
  expiration: string | null;
  crowdsec_created_at: string | null;
};

/** Decision embedded in the by-ip detail response: source stripped, alert parsed. */
export type DecisionSummaryDelivery = Omit<CanonicalDecision, 'source' | 'alert'> & {
  alert?: Omit<AlertDelivery, 'source'>;
};

/** Decisions grouped by source IP, as delivered (embedded decisions canonicalized). */
export interface DecisionGroup {
  ip: string;
  country?: string;
  owner?: string;
  as_number?: string;
  latitude?: number;
  longitude?: number;
  range?: string;
  active_decisions: number;
  total_decisions: number;
  decisions?: CanonicalDecision[];
}

/** Grouping helper output: groups still carry raw Decision rows (pre-canonicalization). */
export interface RawDecisionGroup extends Omit<DecisionGroup, 'decisions'> {
  decisions?: DecisionWithAlert[];
}

/** Delivered payload of the decisions list endpoint. */
export interface DecisionsListResult {
  filtering: FilteringInfo;
  items: CanonicalDecision[];
  pagination?: Pagination;
  total?: number;
}

/** Delivered payload of the decision detail endpoint. */
export interface DecisionsDetailResult extends Omit<CanonicalDecision, 'alert'> {
  alert?: AlertDelivery;
}

/** Delivered payload of the decisions grouped by IP list endpoint. */
export interface DecisionsByIpListResult {
  filtering: FilteringInfo;
  groups: DecisionGroup[];
  pagination?: Pagination;
  total?: number;
}

/** Delivered payload of the decision by IP detail endpoint. */
export interface DecisionsByIpDetailResult extends Omit<DecisionGroup, 'decisions'> {
  decisions: DecisionSummaryDelivery[];
}
