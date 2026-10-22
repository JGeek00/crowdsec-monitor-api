import type { UnparsedMetaData } from '@/shared/meta-data';
import type { Alert } from '@/domain/entities/alert.entity';
import type { Decision } from '@/domain/entities/decision.entity';

/** Filter criteria for alert listing (previously in-controller JS filtering). */
export interface AlertFilters {
  limit?: number;
  offset?: number;
  unpaged?: boolean;
  scenario?: string | string[];
  simulated?: boolean | string;
  ip_address?: string | string[];
  country?: string | string[];
  ip_owner?: string | string[];
  target?: string | string[];
  /** `yyyy-MM-dd:hh:mm:ss` (UTC) on the wire; the list use case normalizes it to a Date. */
  start_timestamp?: string | Date;
  /** `yyyy-MM-dd:hh:mm:ss` (UTC) on the wire; the list use case normalizes it to a Date. */
  end_timestamp?: string | Date;
}

/** Facets extracted from the whole table for the filtering UI. */
export interface AlertFilteringOptions {
  countries: string[];
  scenarios: string[];
  ipOwners: string[];
  targets: string[];
}

export interface AlertPage {
  items: import('@/delivery/http/presenters/alerts/AlertDelivery.model').AlertDelivery[];
  total: number;
  filtering: AlertFilteringOptions;
}

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-alert.repository.ts
// Called by: application/use-cases/alerts/*
export interface AlertRepository {
  /** Lists alerts applying filters; includes the decisions of each alert (aggregate). */
  findWithFilters(filters: AlertFilters): Promise<AlertPage>;
  findById(id: number): Promise<Alert<UnparsedMetaData> | null>;
  /** Alerts by explicit ids (notification history drill-down). */
  findByIds(ids: number[]): Promise<Alert<UnparsedMetaData>[]>;
  /** Batch upsert keyed by CrowdSec alert UUID. */
  upsertBatch(alerts: Alert<UnparsedMetaData>[]): Promise<number>;
  deleteById(id: number): Promise<boolean>;
  /** Deletes decisions whose alert no longer exists upstream. */
  deleteOlderThan(cutoff: Date): Promise<number>;
  /** Decisions belonging to one alert (part of the alert aggregate). */
  findDecisionsByAlertId(alertId: number): Promise<Decision[]>;
  findDecisions(): Promise<Decision[]>;
  /** Aggregate counters for the alerts stats endpoint. */
  getStats(): Promise<{
    total: number;
    simulated: number;
    topScenarios: { scenario: string; count: number }[];
    sources: { cn: string | undefined; as_name: string | undefined }[];
  }>;

  // ── Statistics aggregations (moved from statistics controllers) ──
  getTopCountries(): Promise<{ countryCode: string; amount: number }[]>;
  getCountryHistory(countryCode: string): Promise<{ date: string; amount: number }[]>;
  getTopIpOwners(): Promise<{ ipOwner: string; amount: number }[]>;
  getIpOwnerHistory(ipOwner: string): Promise<{ date: string; amount: number }[]>;
  getTopScenarios(): Promise<{ scenario: string; amount: number }[]>;
  getScenarioHistory(scenario: string): Promise<{ date: string; amount: number }[]>;
  getTopTargets(): Promise<{ target: string; amount: number }[]>;
  getTargetHistory(target: string): Promise<{ date: string; amount: number }[]>;
  getGeneralStats(since: string | undefined, limit: number | undefined): Promise<GeneralStatistics>;
}

/** Raw general-statistics aggregation as produced by the repository.
 *  NOTE: `topCountries`/`topIpOwners`/`topTargets` use `{ item, amount }`;
 *  delivery maps them to the response field names. */
export interface GeneralStatistics {
  alertsLast24Hours: number;
  activeDecisions: number;
  activityHistory: { date: string; amountAlerts: number; amountDecisions: number }[];
  topCountries: { item: string; amount: number }[];
  topScenarios: { scenario: string; amount: number }[];
  topIpOwners: { item: string; amount: number }[];
  topTargets: { item: string; amount: number }[];
}
