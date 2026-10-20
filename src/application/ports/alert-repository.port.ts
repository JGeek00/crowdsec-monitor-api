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
}
