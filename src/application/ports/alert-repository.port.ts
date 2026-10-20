import type { UnparsedMetaData } from '@/shared/meta-data';
import type { Alert } from '@/domain/entities/alert.entity';
import type { Decision } from '@/domain/entities/decision.entity';

/** Filter criteria for alert listing (previously in-controller JS filtering). */
export interface AlertFilters {
  limit?: number;
  offset?: number;
  unpaged?: boolean;
  scenario?: string | string[];
  simulated?: unknown;
  ip_address?: string | string[];
  country?: string | string[];
  ip_owner?: string | string[];
  target?: string | string[];
}

/** Facets extracted from the whole table for the filtering UI. */
export interface AlertFilteringOptions {
  countries: string[];
  scenarios: string[];
  ipOwners: string[];
  targets: string[];
}

export interface AlertPage {
  items: import('@/models').AlertDelivery[];
  total: number;
  filtering: AlertFilteringOptions;
}

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-alert.repository.ts
// Called by: application/use-cases/alerts/*
export interface AlertRepository {
  /** Lists alerts applying filters; includes the decisions of each alert (aggregate). */
  findWithFilters(filters: AlertFilters): Promise<AlertPage>;
  findById(id: number): Promise<Alert<UnparsedMetaData> | null>;
  /** Batch upsert keyed by CrowdSec alert UUID. */
  upsertBatch(alerts: unknown[]): Promise<number>;
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
  getGeneralStats(since: string | undefined, limit: number | undefined): Promise<unknown>;
}
