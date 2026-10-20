import type { MetaData, UnparsedMetaData } from '@/shared/meta-data';
import type { Alert } from '@/domain/entities/alert.entity';
import type { Decision } from '@/domain/entities/decision.entity';

/** Filter criteria for alert listing (previously in-controller JS filtering). */
export interface AlertFilters {
  limit?: number;
  offset?: number;
  scenario?: string;
  country?: string;
  owner?: string;
  target?: string;
  origin?: string;
  metadata?: string;
}

export interface AlertPage<T extends MetaData = UnparsedMetaData> {
  items: Alert<T>[];
  total: number;
  /** Populated when a filter forced in-memory filtering (bypasses SQL pagination). */
  filtering?: string[];
}

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-alert.repository.ts
// Called by: application/use-cases/alerts/*
export interface AlertRepository {
  /** Lists alerts applying filters; includes the decisions of each alert (aggregate). */
  findWithFilters(filters: AlertFilters): Promise<AlertPage>;
  findById<T extends MetaData = UnparsedMetaData>(id: number): Promise<Alert<T> | null>;
  /** Batch upsert keyed by CrowdSec alert UUID. */
  upsertBatch(alerts: unknown[]): Promise<number>;
  deleteById(id: number): Promise<boolean>;
  /** Deletes decisions whose alert no longer exists upstream. */
  deleteOlderThan(cutoff: Date): Promise<number>;
  /** Decisions belonging to one alert (part of the alert aggregate). */
  findDecisionsByAlertId(alertId: number): Promise<Decision[]>;
  findDecisions(): Promise<Decision[]>;
}
