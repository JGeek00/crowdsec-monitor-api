import type { Decision } from '@/domain/entities/decision.entity';
import type { FilteringInfo, GetDecisionsQueryParams } from '@/application/use-cases/decisions/decisions.dto';

// Implemented by: infrastructure/persistence/sequelize/repositories/sequelize-decision.repository.ts
// Called by: application/use-cases/decisions/*
export interface DecisionQueryOptions {
  withAlert?: boolean;
  /** Group semantics for the where clause (by-ip endpoints group in JS). */
  group?: boolean;
}

export interface DecisionRepository {
  findById(id: number, options?: DecisionQueryOptions): Promise<Decision | null>;
  /** List query: the repository translates the query DTO into the where clause. */
  findByQuery(query: GetDecisionsQueryParams, options?: DecisionQueryOptions): Promise<Decision[]>;
  /** Distinct countries / ip owners present in decision sources (list `filtering`). */
  fetchFilteringOptions(): Promise<FilteringInfo>;
  findByIp(ip: string, options?: DecisionQueryOptions): Promise<Decision[]>;
  create(decision: Omit<Decision, 'id' | 'created_at' | 'updated_at'>): Promise<Decision>;
  deleteById(id: number): Promise<boolean>;
  /** Marks a decision expired locally (legacy delete semantics). */
  expireById(id: number): Promise<void>;
  /** Aggregate counters for the decisions stats endpoint. */
  getStats(): Promise<{ total: number; byType: unknown[]; byScope: unknown[] }>;
}
